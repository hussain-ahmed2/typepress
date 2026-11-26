import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import type { StorageAdapter } from '../../infrastructure/storage/storage_adapter';
import type { ImageService } from '../../infrastructure/image_service';

vi.mock('../../infrastructure/storage', () => ({
  get_storage_adapter: vi.fn(),
}));

interface SelectChain {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  then: <T>(resolve: (value: unknown[]) => T | PromiseLike<T>) => Promise<T>;
}

interface InsertChain {
  values: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  then: <T>(resolve: (value: unknown[]) => T | PromiseLike<T>) => Promise<T>;
}

interface DeleteChain {
  where: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  then: <T>(resolve: (value: unknown[]) => T | PromiseLike<T>) => Promise<T>;
}

interface MockDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const { mock_db, queue_select, queue_insert, queue_delete, reset_db_queues } = vi.hoisted(() => {
  function create_select_chain(result: unknown[]): SelectChain {
    const chain: SelectChain = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      offset: vi.fn(),
      then: (resolve) => Promise.resolve(result).then(resolve),
    };
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
    return chain;
  }

  function create_insert_chain(result: unknown[]): InsertChain {
    const chain: InsertChain = {
      values: vi.fn(),
      returning: vi.fn(),
      then: (resolve) => Promise.resolve(result).then(resolve),
    };
    chain.values.mockReturnValue(chain);
    chain.returning.mockReturnValue(chain);
    return chain;
  }

  function create_delete_chain(result: unknown[]): DeleteChain {
    const chain: DeleteChain = {
      where: vi.fn(),
      returning: vi.fn(),
      then: (resolve) => Promise.resolve(result).then(resolve),
    };
    chain.where.mockReturnValue(chain);
    chain.returning.mockReturnValue(chain);
    return chain;
  }

  const select_queue: SelectChain[] = [];
  const insert_queue: InsertChain[] = [];
  const delete_queue: DeleteChain[] = [];

  const mock_db: MockDb = {
    select: vi.fn(() => select_queue.shift() ?? create_select_chain([])),
    insert: vi.fn(() => insert_queue.shift() ?? create_insert_chain([])),
    delete: vi.fn(() => delete_queue.shift() ?? create_delete_chain([])),
  };

  return {
    mock_db,
    queue_select: (result: unknown[]): SelectChain => {
      const chain = create_select_chain(result);
      select_queue.push(chain);
      return chain;
    },
    queue_insert: (result: unknown[]): InsertChain => {
      const chain = create_insert_chain(result);
      insert_queue.push(chain);
      return chain;
    },
    queue_delete: (result: unknown[] = []): DeleteChain => {
      const chain = create_delete_chain(result);
      delete_queue.push(chain);
      return chain;
    },
    reset_db_queues: (): void => {
      select_queue.length = 0;
      insert_queue.length = 0;
      delete_queue.length = 0;
    },
  };
});

vi.mock('@typepress/db', () => ({
  db: mock_db,
  // Table marker; actual column refs are not needed for these unit tests.
  media: { id: 'id', created_at: 'created_at' },
}));

import { MediaService } from './media.service';

function create_storage_mock(): StorageAdapter & { upload: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } {
  return {
    upload: vi.fn(async (input: { key: string }) => ({ key: input.key, url: `/uploads/${input.key}` })),
    delete: vi.fn(async () => undefined),
    get_public_url: vi.fn((key: string) => `/uploads/${key}`),
  };
}

function create_image_service_mock(): ImageService {
  return {
    process_upload_image: vi.fn(async (buffer: Buffer) => ({
      buffer,
      width: 10,
      height: 10,
      format: 'png',
    })),
    generate_variants: vi.fn(async () => ([
      {
        name: 'thumbnail',
        buffer: Buffer.from('thumb'),
        width: 150,
        height: 150,
        size: 5,
        mimetype: 'image/webp',
        format: 'webp',
      },
      {
        name: 'small',
        buffer: Buffer.from('small'),
        width: 320,
        height: 320,
        size: 5,
        mimetype: 'image/webp',
        format: 'webp',
      },
    ])),
  } as unknown as ImageService;
}

async function create_png_buffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

describe('MediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset_db_queues();
  });

  it('rejects unsupported file types', async () => {
    const storage = create_storage_mock();
    const service = new MediaService({ storage, images: create_image_service_mock() });

    const result = await service.upload_file(
      {
        filename: 'evil.exe',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('MZ-bad-binary'),
      },
      'user-1',
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects files whose content does not match declared MIME type', async () => {
    const storage = create_storage_mock();
    const service = new MediaService({ storage, images: create_image_service_mock() });

    const result = await service.upload_file(
      {
        filename: 'photo.png',
        mimetype: 'image/png',
        buffer: Buffer.from('not really a png'),
      },
      'user-1',
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_FILE_TYPE');
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('uploads a valid image, processes it, stores original and variants, and persists metadata', async () => {
    const storage = create_storage_mock();
    const images = create_image_service_mock();
    const service = new MediaService({ storage, images });
    const png_buffer = await create_png_buffer();

    const insert_chain = queue_insert([]);
    // Drizzle insert(...).values(...).returning() resolves to inserted rows.
    insert_chain.returning.mockImplementation(async () => {
      const values = insert_chain.values.mock.calls[0]?.[0] as Record<string, unknown>;
      return [{
        id: 'media-1',
        filename: values.filename,
        mimetype: values.mimetype,
        size: values.size,
        url: values.url,
        storage_key: values.storage_key,
        width: values.width,
        height: values.height,
        variants: values.variants,
        uploader_id: values.uploader_id,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      }];
    });

    const result = await service.upload_file(
      { filename: 'photo.png', mimetype: 'image/png', buffer: png_buffer },
      'user-1',
    );

    expect(result.success).toBe(true);
    expect(images.process_upload_image).toHaveBeenCalledTimes(1);
    expect((images as unknown as { generate_variants: ReturnType<typeof vi.fn> }).generate_variants).toHaveBeenCalledTimes(1);
    // 1 original + 2 variants from mock
    expect(storage.upload).toHaveBeenCalledTimes(3);
    expect(mock_db.insert).toHaveBeenCalledTimes(1);
    expect(insert_chain.values).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'photo.png',
      mimetype: 'image/png',
      uploader_id: 'user-1',
      width: 10,
      height: 10,
    }));
    expect(result.data?.storage_key).toContain('media/');
    expect(result.data?.variants).toHaveLength(2);
    expect(result.data?.variants[0]).toMatchObject({ name: 'thumbnail', mimetype: 'image/webp' });
  });

  it('cleans up stored original and variants when DB persistence fails', async () => {
    const storage = create_storage_mock();
    const service = new MediaService({ storage, images: create_image_service_mock() });
    const png_buffer = await create_png_buffer();

    const insert_chain = queue_insert([]);
    insert_chain.returning.mockRejectedValue(new Error('db down'));

    const result = await service.upload_file(
      { filename: 'photo.png', mimetype: 'image/png', buffer: png_buffer },
      'user-1',
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DATABASE_ERROR');
    // 1 original + 2 variants uploaded
    expect(storage.upload).toHaveBeenCalledTimes(3);
    // Cleanup should remove original + both uploaded variants
    expect(storage.delete).toHaveBeenCalledTimes(3);
  });

  it('deletes DB record, stored original, and stored variants', async () => {
    const storage = create_storage_mock();
    const service = new MediaService({ storage, images: create_image_service_mock() });

    // findUnique -> select().from().where().limit(1)
    queue_select([{
      id: 'media-1',
      storage_key: 'media/2026/05/file.png',
      url: '/uploads/media/2026/05/file.png',
      variants: [
        { name: 'thumbnail', key: 'media/2026/05/file-thumbnail.webp', url: '/uploads/media/2026/05/file-thumbnail.webp', width: 150, height: 150, size: 100, mimetype: 'image/webp' },
        { name: 'small', key: 'media/2026/05/file-small.webp', url: '/uploads/media/2026/05/file-small.webp', width: 320, height: 200, size: 200, mimetype: 'image/webp' },
      ],
    }]);
    const delete_chain = queue_delete([]);

    const result = await service.delete('media-1');

    expect(result.success).toBe(true);
    expect(storage.delete).toHaveBeenCalledTimes(3);
    expect(storage.delete).toHaveBeenCalledWith('media/2026/05/file.png');
    expect(storage.delete).toHaveBeenCalledWith('media/2026/05/file-thumbnail.webp');
    expect(storage.delete).toHaveBeenCalledWith('media/2026/05/file-small.webp');
    expect(mock_db.delete).toHaveBeenCalledTimes(1);
    expect(delete_chain.where).toHaveBeenCalledTimes(1);
  });

  it('returns not found when deleting unknown media', async () => {
    const storage = create_storage_mock();
    const service = new MediaService({ storage, images: create_image_service_mock() });
    queue_select([]);

    const result = await service.delete('missing');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('uploads non-image files without image processing', async () => {
    const storage = create_storage_mock();
    const images = create_image_service_mock();
    const service = new MediaService({ storage, images });
    const pdf_buffer = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('minimal')]);

    const insert_chain = queue_insert([]);
    insert_chain.returning.mockImplementation(async () => {
      const values = insert_chain.values.mock.calls[0]?.[0] as Record<string, unknown>;
      return [{
        id: 'media-pdf',
        filename: values.filename,
        mimetype: values.mimetype,
        size: values.size,
        url: values.url,
        storage_key: values.storage_key,
        width: values.width,
        height: values.height,
        variants: values.variants,
        uploader_id: values.uploader_id,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      }];
    });

    const result = await service.upload_file(
      { filename: 'doc.pdf', mimetype: 'application/pdf', buffer: pdf_buffer },
      'user-1',
    );

    expect(result.success).toBe(true);
    expect(images.process_upload_image).not.toHaveBeenCalled();
    expect((images as unknown as { generate_variants: ReturnType<typeof vi.fn> }).generate_variants).not.toHaveBeenCalled();
    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(result.data?.variants).toEqual([]);
    expect(result.data?.width).toBeNull();
    expect(result.data?.height).toBeNull();
  });

  it('cleans up original upload when variant generation fails', async () => {
    const storage = create_storage_mock();
    const images = create_image_service_mock();
    (images as unknown as { generate_variants: ReturnType<typeof vi.fn> }).generate_variants
      .mockRejectedValue(new Error('sharp failed'));
    const service = new MediaService({ storage, images });
    const png_buffer = await create_png_buffer();

    const result = await service.upload_file(
      { filename: 'photo.png', mimetype: 'image/png', buffer: png_buffer },
      'user-1',
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_IMAGE');
    expect(storage.upload).toHaveBeenCalledTimes(1); // original uploaded before variant failure
    expect(storage.delete).toHaveBeenCalledTimes(1); // original cleaned up
    expect(mock_db.insert).not.toHaveBeenCalled();
  });

  it('does not delete DB record when variant storage deletion fails', async () => {
    const storage = create_storage_mock();
    storage.delete.mockImplementation(async (key: string) => {
      if (key.includes('thumbnail')) throw new Error('s3 delete failed');
    });
    const service = new MediaService({ storage, images: create_image_service_mock() });
    queue_select([{
      id: 'media-1',
      storage_key: 'media/2026/05/file.png',
      url: '/uploads/media/2026/05/file.png',
      variants: [
        { name: 'thumbnail', key: 'media/2026/05/file-thumbnail.webp', url: '/uploads/media/2026/05/file-thumbnail.webp', width: 150, height: 150, size: 100, mimetype: 'image/webp' },
      ],
    }]);

    const result = await service.delete('media-1');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('STORAGE_ERROR');
    expect(mock_db.delete).not.toHaveBeenCalled();
  });

  it('normalizes media variants when listing records', async () => {
    const storage = create_storage_mock();
    const service = new MediaService({ storage, images: create_image_service_mock() });
    // First select: list rows. Second select: count.
    queue_select([
      {
        id: 'media-1',
        filename: 'photo.png',
        mimetype: 'image/png',
        size: 123,
        url: '/uploads/media/2026/05/photo.png',
        storage_key: 'media/2026/05/photo.png',
        width: 800,
        height: 600,
        variants: [
          { name: 'thumbnail', key: 'k1', url: '/u/1', width: 150, height: 150, size: 10, mimetype: 'image/webp' },
          { bad: 'entry' }, // invalid entries are ignored
        ],
        uploader_id: 'user-1',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    queue_select([{ total: 1 }]);

    const result = await service.list({ page: 1, limit: 20 });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    const first_media = result.data?.[0];
    expect(first_media?.variants).toEqual([
      { name: 'thumbnail', key: 'k1', url: '/u/1', width: 150, height: 150, size: 10, mimetype: 'image/webp' },
    ]);
  });
});
