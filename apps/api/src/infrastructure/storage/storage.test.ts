import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalStorageAdapter, normalize_storage_key } from './local_storage_adapter';

const temp_dirs: string[] = [];

async function create_temp_dir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'typepress-storage-'));
  temp_dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(temp_dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('normalize_storage_key', () => {
  it('normalizes valid keys', () => {
    expect(normalize_storage_key('media/2026/05/file.png')).toBe('media/2026/05/file.png');
    expect(normalize_storage_key('/media/file.png')).toBe('media/file.png');
  });

  it('rejects path traversal and invalid keys', () => {
    expect(() => normalize_storage_key('../secret.txt')).toThrow('path traversal');
    expect(() => normalize_storage_key('media/../../secret.txt')).toThrow('path traversal');
    expect(() => normalize_storage_key('')).toThrow('empty');
    expect(() => normalize_storage_key('media/bad name.png')).toThrow('unsupported characters');
  });
});

describe('LocalStorageAdapter', () => {
  it('uploads, resolves URL, and deletes files', async () => {
    const base_path = await create_temp_dir();
    const adapter = new LocalStorageAdapter({ base_path, public_url_base: '/uploads' });
    const buffer = Buffer.from('hello-typepress');

    const stored = await adapter.upload({
      key: 'media/2026/05/test-file.txt',
      buffer,
      mimetype: 'text/plain',
    });

    expect(stored.key).toBe('media/2026/05/test-file.txt');
    expect(stored.url).toBe('/uploads/media/2026/05/test-file.txt');

    const file_path = path.join(base_path, 'media/2026/05/test-file.txt');
    await expect(readFile(file_path, 'utf8')).resolves.toBe('hello-typepress');

    await adapter.delete(stored.key);
    await expect(stat(file_path)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('treats missing delete as non-fatal', async () => {
    const base_path = await create_temp_dir();
    const adapter = new LocalStorageAdapter({ base_path, public_url_base: '/uploads' });

    await expect(adapter.delete('media/missing.txt')).resolves.toBeUndefined();
  });

  it('rejects traversal outside base path', async () => {
    const base_path = await create_temp_dir();
    const adapter = new LocalStorageAdapter({ base_path, public_url_base: '/uploads' });

    await expect(
      adapter.upload({ key: '../escape.txt', buffer: Buffer.from('x'), mimetype: 'text/plain' }),
    ).rejects.toThrow('path traversal');
  });
});
