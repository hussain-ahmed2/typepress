/**
 * Local Storage Adapter — Filesystem-backed storage for development/default use.
 *
 * Files are written under a configured base directory. Public URLs are built from
 * a configured base URL (typically "/uploads"), which the API serves as static files.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { StorageAdapter, StoredFile, UploadFileInput } from './storage_adapter';

export interface LocalStorageAdapterOptions {
  /** Absolute or relative base directory where files are stored. */
  base_path: string;
  /** Public URL base used to build file URLs (e.g. "/uploads"). */
  public_url_base: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly base_path: string;
  private readonly public_url_base: string;

  constructor(options: LocalStorageAdapterOptions) {
    this.base_path = path.resolve(options.base_path);
    this.public_url_base = options.public_url_base.replace(/\/+$/, '');
  }

  async upload(input: UploadFileInput): Promise<StoredFile> {
    const file_path = this.resolve_safe_path(input.key);
    await mkdir(path.dirname(file_path), { recursive: true });
    await writeFile(file_path, input.buffer);

    return {
      key: input.key,
      url: this.get_public_url(input.key),
    };
  }

  async delete(key: string): Promise<void> {
    const file_path = this.resolve_safe_path(key);
    try {
      await rm(file_path, { force: true });
    } catch (error: unknown) {
      // Missing files are non-fatal; storage may already be cleaned up.
      if (is_missing_file_error(error)) return;
      throw error;
    }
  }

  get_public_url(key: string): string {
    const normalized_key = normalize_storage_key(key);
    return `${this.public_url_base}/${normalized_key.split('/').map(encodeURIComponent).join('/')}`;
  }

  /** Resolve a key to an absolute path and reject traversal outside base_path. */
  private resolve_safe_path(key: string): string {
    const normalized_key = normalize_storage_key(key);
    const resolved = path.resolve(this.base_path, normalized_key);
    const base_with_sep = this.base_path.endsWith(path.sep)
      ? this.base_path
      : `${this.base_path}${path.sep}`;

    if (resolved !== this.base_path && !resolved.startsWith(base_with_sep)) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    return resolved;
  }
}

/** Normalize and validate storage keys to a safe relative POSIX-style path. */
export function normalize_storage_key(key: string): string {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (normalized.length === 0) {
    throw new Error('Invalid storage key: key is empty');
  }

  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Invalid storage key: path traversal detected');
  }

  // Only allow a conservative set of path characters to avoid unsafe filenames.
  if (!/^[a-zA-Z0-9._/-]+$/.test(segments.join('/'))) {
    throw new Error('Invalid storage key: contains unsupported characters');
  }

  return segments.join('/');
}

function is_missing_file_error(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}
