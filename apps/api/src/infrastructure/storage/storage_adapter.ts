/**
 * Storage Adapter — Abstraction for file storage backends.
 *
 * Implementations:
 *   - LocalStorageAdapter: stores files on local filesystem (dev/default)
 *   - S3StorageAdapter: stores files in S3/MinIO-compatible object storage
 *
 * The adapter stores objects by a caller-provided key and returns public URL metadata.
 * Keys should be stable, path-safe identifiers (e.g. "media/2026/05/uuid-file.jpg").
 */

export interface StoredFile {
  /** Storage key used to locate/delete the object. */
  key: string;
  /** Public URL or API-relative URL for the stored object. */
  url: string;
}

export interface UploadFileInput {
  /** Storage key (path) for the object. */
  key: string;
  /** Raw file contents. */
  buffer: Buffer;
  /** MIME type for content-type metadata. */
  mimetype: string;
}

export interface StorageAdapter {
  /** Persist a file and return its storage key and public URL. */
  upload(input: UploadFileInput): Promise<StoredFile>;
  /** Delete a stored object by key. Missing objects should be treated as non-fatal. */
  delete(key: string): Promise<void>;
  /** Resolve a public URL for a known key. */
  get_public_url(key: string): string;
}
