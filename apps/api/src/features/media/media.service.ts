/**
 * Media Service — Business logic for media upload, listing, and deletion.
 *
 * Upload pipeline:
 *   1. Validate file size/type and sniff magic bytes.
 *   2. For images, normalize via Sharp (auto-orient, constrain max dimensions).
 *   3. Store file through the configured StorageAdapter (local or S3/MinIO).
 *   4. Persist media metadata in the database.
 *   5. On DB failure, best-effort cleanup of stored object.
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { db, media } from '@typepress/db';
import { count, desc, eq } from 'drizzle-orm';
import type { ApiResponse, MediaVariant, PaginatedResponse } from '@typepress/shared-types';
import { get_storage_adapter, type StorageAdapter } from '../../infrastructure/storage';
import {
  image_service,
  IMAGE_VARIANT_SPECS,
  type GeneratedImageVariant,
  type ImageService,
} from '../../infrastructure/image_service';
import type { ListMediaQuery } from './media.validators';

export interface MediaRecord {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  storage_key: string | null;
  width: number | null;
  height: number | null;
  variants: MediaVariant[];
  uploader_id: string;
  created_at: Date;
}

export interface UploadMediaFile {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface MediaServiceDependencies {
  storage: StorageAdapter;
  images: ImageService;
}

/** Maximum upload size (10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set<string>([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  // Audio/Video (common CMS uploads)
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

/** Magic-byte signatures for common file types. */
const MAGIC_SIGNATURES: Array<{ mimetype: string; bytes: number[]; offset?: number }> = [
  { mimetype: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mimetype: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mimetype: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mimetype: 'image/webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // "WEBP" at offset 8, after "RIFF...."
  { mimetype: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mimetype: 'video/mp4', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // "ftyp" at offset 4
];

export class MediaService {
  private readonly storage: StorageAdapter;
  private readonly images: ImageService;

  constructor(dependencies?: Partial<MediaServiceDependencies>) {
    this.storage = dependencies?.storage ?? get_storage_adapter();
    this.images = dependencies?.images ?? image_service;
  }

  /** List media with pagination, ordered by newest first. */
  async list(query: ListMediaQuery): Promise<PaginatedResponse<MediaRecord>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, count_rows] = await Promise.all([
      db
        .select()
        .from(media)
        .orderBy(desc(media.created_at))
        .limit(limit)
        .offset(skip),
      db.select({ total: count() }).from(media),
    ]);

    const total = Number(count_rows[0]?.total ?? 0);

    return {
      success: true,
      data: items.map(to_media_record),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /** Upload a file, store it, generate image variants, and persist media metadata. */
  async upload_file(file: UploadMediaFile, uploader_id: string): Promise<ApiResponse<MediaRecord>> {
    const validation_error = validate_upload_file(file);
    if (validation_error) {
      return { success: false, error: validation_error };
    }

    const safe_filename = sanitize_filename(file.filename);
    const normalized_mimetype = normalize_mimetype(file.mimetype, safe_filename);

    const mimetype_error = validate_mimetype(normalized_mimetype);
    if (mimetype_error) {
      return { success: false, error: mimetype_error };
    }

    const sniff_error = validate_magic_bytes(file.buffer, normalized_mimetype);
    if (sniff_error) {
      return { success: false, error: sniff_error };
    }

    let processed_buffer = file.buffer;
    let processed_mimetype = normalized_mimetype;
    let width: number | null = null;
    let height: number | null = null;

    const should_process_image = is_image_mimetype(processed_mimetype) && processed_mimetype !== 'image/svg+xml';
    if (should_process_image) {
      try {
        const processed = await this.images.process_upload_image(file.buffer);
        processed_buffer = processed.buffer;
        width = processed.width ?? null;
        height = processed.height ?? null;
        // Keep original mimetype; Sharp preserves format unless explicitly changed.
        if (processed.format) {
          const mapped = map_sharp_format_to_mimetype(processed.format);
          if (mapped) processed_mimetype = mapped;
        }
      } catch {
        return {
          success: false,
          error: { code: 'INVALID_IMAGE', message: 'Uploaded image could not be processed' },
        };
      }
    }

    const storage_key = create_storage_key(safe_filename);

    let stored: { key: string; url: string };
    try {
      stored = await this.storage.upload({
        key: storage_key,
        buffer: processed_buffer,
        mimetype: processed_mimetype,
      });
    } catch (error: unknown) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: get_error_message(error, 'Failed to store uploaded file'),
        },
      };
    }

    let variants: MediaVariant[] = [];
    if (should_process_image) {
      const variants_result = await this.generate_and_store_variants(processed_buffer, storage_key);
      if (!variants_result.success) {
        // Cleanup original when variant generation/storage fails to avoid partial uploads.
        await this.storage.delete(stored.key).catch(() => undefined);
        await this.delete_stored_keys(variants_result.uploaded_keys);
        return { success: false, error: variants_result.error };
      }
      variants = variants_result.variants;
    }

    try {
      const [created_media] = await db
        .insert(media)
        .values({
          id: randomUUID(),
          filename: safe_filename,
          mimetype: processed_mimetype,
          size: processed_buffer.length,
          url: stored.url,
          storage_key: stored.key,
          width,
          height,
          // Media variants are persisted as JSONB; MediaVariant[] is a typed subset.
          variants: variants as unknown[],
          uploader_id,
        })
        .returning();

      if (!created_media) {
        throw new Error('Insert returned no media row');
      }

      return { success: true, data: to_media_record(created_media) };
    } catch (error: unknown) {
      // Best-effort cleanup so storage does not accumulate orphaned objects.
      await this.storage.delete(stored.key).catch(() => undefined);
      await this.delete_stored_keys(variants.map((variant) => variant.key));
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: get_error_message(error, 'Failed to persist media record'),
        },
      };
    }
  }

  /** Generate image variants, upload them, and return variant metadata. */
  private async generate_and_store_variants(
    source_buffer: Buffer,
    original_storage_key: string,
  ): Promise<
    | { success: true; variants: MediaVariant[] }
    | { success: false; error: NonNullable<ApiResponse['error']>; uploaded_keys: string[] }
  > {
    let generated: GeneratedImageVariant[];
    try {
      generated = await this.images.generate_variants(source_buffer, IMAGE_VARIANT_SPECS);
    } catch (error: unknown) {
      return {
        success: false,
        error: {
          code: 'INVALID_IMAGE',
          message: get_error_message(error, 'Failed to generate image variants'),
        },
        uploaded_keys: [],
      };
    }

    const uploaded_keys: string[] = [];
    const variants: MediaVariant[] = [];

    for (const variant of generated) {
      const variant_key = create_variant_storage_key(original_storage_key, variant.name, variant.format);
      try {
        const stored = await this.storage.upload({
          key: variant_key,
          buffer: variant.buffer,
          mimetype: variant.mimetype,
        });
        uploaded_keys.push(stored.key);
        variants.push({
          name: variant.name,
          key: stored.key,
          url: stored.url,
          width: variant.width,
          height: variant.height,
          size: variant.size,
          mimetype: variant.mimetype,
        });
      } catch (error: unknown) {
        return {
          success: false,
          error: {
            code: 'STORAGE_ERROR',
            message: get_error_message(error, `Failed to store image variant "${variant.name}"`),
          },
          uploaded_keys,
        };
      }
    }

    return { success: true, variants };
  }

  /** Best-effort deletion for a list of storage keys (used for rollback/cleanup). */
  private async delete_stored_keys(keys: string[]): Promise<void> {
    await Promise.all(keys.map(async (key) => {
      await this.storage.delete(key).catch(() => undefined);
    }));
  }

  /** Delete a media record and all stored objects (original + variants). */
  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    const [existing] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Media not found' },
      };
    }

    const variant_records = normalize_media_variants(existing.variants);
    const storage_keys = collect_media_storage_keys(existing.storage_key, existing.url, variant_records);
    const storage_error = await this.delete_storage_keys_strict(storage_keys);
    if (storage_error) {
      return { success: false, error: storage_error };
    }

    await db.delete(media).where(eq(media.id, id));
    return { success: true, data: { message: 'Media deleted' } };
  }

  /**
   * Delete storage keys and return an error if any deletion fails.
   * Used by media deletion where DB record should remain when storage cleanup fails.
   */
  private async delete_storage_keys_strict(keys: string[]): Promise<ApiResponse['error'] | null> {
    const failures: string[] = [];

    for (const key of keys) {
      try {
        await this.storage.delete(key);
      } catch {
        failures.push(key);
      }
    }

    if (failures.length > 0) {
      return {
        code: 'STORAGE_ERROR',
        message: `Failed to delete stored file(s): ${failures.join(', ')}`,
      };
    }

    return null;
  }
}

/** Raw media row shape selected by Drizzle that we normalize into API records. */
interface MediaDatabaseRow {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  storage_key: string | null;
  width: number | null;
  height: number | null;
  variants: unknown;
  uploader_id: string;
  created_at: Date;
}

/** Convert a Drizzle media row into a typed API media record. */
function to_media_record(row: MediaDatabaseRow): MediaRecord {
  return {
    id: row.id,
    filename: row.filename,
    mimetype: row.mimetype,
    size: row.size,
    url: row.url,
    storage_key: row.storage_key,
    width: row.width,
    height: row.height,
    variants: normalize_media_variants(row.variants),
    uploader_id: row.uploader_id,
    created_at: row.created_at,
  };
}

/** Normalize untyped JSONB variants from DB into a safe, typed variant array. */
function normalize_media_variants(value: unknown): MediaVariant[] {
  if (!Array.isArray(value)) return [];

  const variants: MediaVariant[] = [];
  for (const entry of value) {
    const variant = normalize_media_variant(entry);
    if (variant) variants.push(variant);
  }
  return variants;
}

/** Validate and normalize a single variant object from JSON storage. */
function normalize_media_variant(value: unknown): MediaVariant | null {
  if (!is_json_record(value)) return null;

  const name = typeof value.name === 'string' ? value.name : null;
  const key = typeof value.key === 'string' ? value.key : null;
  const url = typeof value.url === 'string' ? value.url : null;
  const width = typeof value.width === 'number' && Number.isFinite(value.width) ? value.width : null;
  const height = typeof value.height === 'number' && Number.isFinite(value.height) ? value.height : null;
  const size = typeof value.size === 'number' && Number.isFinite(value.size) ? value.size : null;
  const mimetype = typeof value.mimetype === 'string' ? value.mimetype : null;

  if (!name || !key || !url || width === null || height === null || size === null || !mimetype) {
    return null;
  }

  return { name, key, url, width, height, size, mimetype };
}

function is_json_record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validate_upload_file(file: UploadMediaFile): ApiResponse['error'] | null {
  if (!file.filename || file.filename.trim().length === 0) {
    return { code: 'INVALID_FILE', message: 'Filename is required' };
  }
  if (!file.mimetype || file.mimetype.trim().length === 0) {
    return { code: 'INVALID_FILE', message: 'MIME type is required' };
  }
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return { code: 'INVALID_FILE', message: 'File content is empty' };
  }
  if (file.buffer.length > MAX_UPLOAD_BYTES) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File exceeds maximum size of ${MAX_UPLOAD_BYTES} bytes`,
    };
  }
  return null;
}

function validate_mimetype(mimetype: string): ApiResponse['error'] | null {
  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    return {
      code: 'UNSUPPORTED_FILE_TYPE',
      message: `File type "${mimetype}" is not allowed`,
    };
  }
  return null;
}

/** Basic magic-byte check for common formats; rejects obvious mismatches. */
function validate_magic_bytes(buffer: Buffer, mimetype: string): ApiResponse['error'] | null {
  const signature = MAGIC_SIGNATURES.find((entry) => entry.mimetype === mimetype);
  if (!signature) {
    // No signature rule for this type; allow through allowlist + size checks.
    return null;
  }

  const offset = signature.offset ?? 0;
  if (buffer.length < offset + signature.bytes.length) {
    return { code: 'INVALID_FILE', message: 'File content is too small for declared type' };
  }

  const matches = signature.bytes.every((byte, index) => buffer[offset + index] === byte);
  if (!matches) {
    // Special case: WEBP files are RIFF containers; verify RIFF header too.
    if (mimetype === 'image/webp') {
      const riff = buffer.length >= 4 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
      const webp = buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
      if (riff && webp) return null;
    }

    return {
      code: 'INVALID_FILE_TYPE',
      message: 'File content does not match declared MIME type',
    };
  }

  return null;
}

function sanitize_filename(filename: string): string {
  const base = path.basename(filename).replace(/[\0\r\n]/g, '');
  const cleaned = base
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');

  const fallback = 'upload';
  const safe = cleaned.length > 0 ? cleaned : fallback;
  // Keep filenames reasonably short for filesystems/object keys.
  return safe.slice(0, 120);
}

function normalize_mimetype(mimetype: string, filename: string): string {
  const normalized = mimetype.split(';')[0]?.trim().toLowerCase() ?? '';
  if (normalized.length > 0) return normalized;

  const ext = path.extname(filename).toLowerCase();
  return extension_to_mimetype(ext) ?? 'application/octet-stream';
}

function extension_to_mimetype(extension: string): string | undefined {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
  };
  return map[extension];
}

function is_image_mimetype(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

function map_sharp_format_to_mimetype(format: string): string | undefined {
  const map: Record<string, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
  };
  return map[format];
}

function create_storage_key(filename: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `media/${year}/${month}/${randomUUID()}-${filename}`;
}

/** Build a deterministic variant key adjacent to the original object key. */
function create_variant_storage_key(original_storage_key: string, variant_name: string, format: string): string {
  const extension = `.${format}`;
  if (original_storage_key.endsWith(extension)) {
    return `${original_storage_key.slice(0, -extension.length)}-${variant_name}${extension}`;
  }

  const dot_index = original_storage_key.lastIndexOf('.');
  const slash_index = original_storage_key.lastIndexOf('/');
  const has_extension = dot_index > slash_index;
  const base = has_extension ? original_storage_key.slice(0, dot_index) : original_storage_key;
  return `${base}-${variant_name}${extension}`;
}

/** Collect unique storage keys for original media + variants. */
function collect_media_storage_keys(
  storage_key: string | null,
  url: string,
  variants: MediaVariant[],
): string[] {
  const keys = new Set<string>();
  const original_key = storage_key ?? extract_storage_key_from_url(url);
  if (original_key) keys.add(original_key);

  for (const variant of variants) {
    const normalized = variant.key.trim();
    if (normalized.length > 0) keys.add(normalized);
  }

  return [...keys];
}

/** Best-effort extraction for legacy/local URLs where key is embedded in /uploads/<key>. */
function extract_storage_key_from_url(url: string): string | null {
  try {
    const parsed = new URL(url, 'http://localhost');
    const pathname = decodeURIComponent(parsed.pathname);
    const uploads_prefix = '/uploads/';
    const index = pathname.indexOf(uploads_prefix);
    if (index >= 0) {
      const key = pathname.slice(index + uploads_prefix.length).replace(/^\/+/, '');
      return key.length > 0 ? key : null;
    }
    return null;
  } catch {
    return null;
  }
}

function get_error_message(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}
