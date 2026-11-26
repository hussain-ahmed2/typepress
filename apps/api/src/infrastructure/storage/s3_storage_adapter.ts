/**
 * S3 Storage Adapter — S3/MinIO-compatible object storage.
 *
 * Uses AWS SDK v3. Works with MinIO by configuring endpoint and forcePathStyle.
 * Delete treats missing objects as non-fatal to keep media deletion idempotent.
 */
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageAdapter, StoredFile, UploadFileInput } from './storage_adapter';
import { normalize_storage_key } from './local_storage_adapter';

export interface S3StorageAdapterOptions {
  endpoint: string;
  region: string;
  access_key: string;
  secret_key: string;
  bucket: string;
  force_path_style: boolean;
  /** Public URL base, e.g. "https://cdn.example.com/bucket" or "http://localhost:9000/typepress-media". */
  public_url_base: string;
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly public_url_base: string;
  private bucket_ensured = false;

  constructor(options: S3StorageAdapterOptions) {
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.access_key,
        secretAccessKey: options.secret_key,
      },
      forcePathStyle: options.force_path_style,
    });
    this.bucket = options.bucket;
    this.public_url_base = options.public_url_base.replace(/\/+$/, '');
  }

  async upload(input: UploadFileInput): Promise<StoredFile> {
    const key = normalize_storage_key(input.key);
    await this.ensure_bucket();

    await this.put_object(key, input);

    return {
      key,
      url: this.get_public_url(key),
    };
  }

  async delete(key: string): Promise<void> {
    const normalized_key = normalize_storage_key(key);
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: normalized_key,
        }),
      );
    } catch (error: unknown) {
      if (is_missing_object_error(error)) return;
      throw error;
    }
  }

  get_public_url(key: string): string {
    const normalized_key = normalize_storage_key(key);
    return `${this.public_url_base}/${normalized_key.split('/').map(encodeURIComponent).join('/')}`;
  }

  private async put_object(key: string, input: UploadFileInput): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: input.buffer,
          ContentType: input.mimetype,
        }),
      );
    } catch (error: unknown) {
      // Create bucket on-demand for local MinIO/dev convenience, then retry once.
      if (is_missing_bucket_error(error)) {
        await this.create_bucket();
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: input.buffer,
            ContentType: input.mimetype,
          }),
        );
        return;
      }
      throw error;
    }
  }

  private async ensure_bucket(): Promise<void> {
    if (this.bucket_ensured) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucket_ensured = true;
    } catch (error: unknown) {
      if (is_missing_bucket_error(error)) {
        await this.create_bucket();
        return;
      }
      // If we can't check (permissions/network), let upload surface the real error.
      throw error;
    }
  }

  private async create_bucket(): Promise<void> {
    await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    this.bucket_ensured = true;
  }
}

function is_missing_bucket_error(error: unknown): boolean {
  const name = get_error_name(error);
  return name === 'NoSuchBucket' || name === 'NotFound';
}

function is_missing_object_error(error: unknown): boolean {
  const name = get_error_name(error);
  return name === 'NoSuchKey' || name === 'NotFound';
}

function get_error_name(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === 'string' ? name : undefined;
  }
  return undefined;
}
