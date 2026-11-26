/**
 * Storage Factory — Creates the configured storage adapter.
 *
 * Driver selection:
 *   - local (default): filesystem under STORAGE_LOCAL_PATH, served from STORAGE_PUBLIC_URL
 *   - s3: S3/MinIO-compatible object storage using MINIO_* config
 */
import path from 'node:path';
import { config } from '../../config';
import { LocalStorageAdapter } from './local_storage_adapter';
import { S3StorageAdapter } from './s3_storage_adapter';
import type { StorageAdapter } from './storage_adapter';

export type { StorageAdapter, StoredFile, UploadFileInput } from './storage_adapter';
export { normalize_storage_key } from './local_storage_adapter';

let storage_adapter_instance: StorageAdapter | undefined;

/** Get the configured storage adapter singleton. */
export function get_storage_adapter(): StorageAdapter {
  if (!storage_adapter_instance) {
    storage_adapter_instance = create_storage_adapter_from_config();
  }
  return storage_adapter_instance;
}

/** Create a storage adapter from current environment config. Useful for tests/overrides. */
export function create_storage_adapter_from_config(): StorageAdapter {
  if (config.STORAGE_DRIVER === 's3') {
    const protocol = config.MINIO_USE_SSL ? 'https' : 'http';
    const endpoint = `${protocol}://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`;
    const public_url_base = is_absolute_url(config.STORAGE_PUBLIC_URL)
      ? config.STORAGE_PUBLIC_URL
      : `${endpoint}/${config.MINIO_BUCKET}`;

    return new S3StorageAdapter({
      endpoint,
      region: config.MINIO_REGION,
      access_key: config.MINIO_ACCESS_KEY,
      secret_key: config.MINIO_SECRET_KEY,
      bucket: config.MINIO_BUCKET,
      force_path_style: true,
      public_url_base,
    });
  }

  return new LocalStorageAdapter({
    base_path: resolve_local_storage_path(config.STORAGE_LOCAL_PATH),
    public_url_base: config.STORAGE_PUBLIC_URL,
  });
}

/** Resolve local storage path relative to API working dir when not absolute. */
export function resolve_local_storage_path(storage_path: string): string {
  return path.isAbsolute(storage_path) ? storage_path : path.resolve(process.cwd(), storage_path);
}

/** Replace singleton, primarily for tests. */
export function set_storage_adapter(adapter: StorageAdapter | undefined): void {
  storage_adapter_instance = adapter;
}

function is_absolute_url(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
