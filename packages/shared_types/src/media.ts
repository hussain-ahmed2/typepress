/** A generated image variant (thumbnail/responsive size) stored alongside the original media. */
export interface MediaVariant {
  /** Stable variant name, e.g. "thumbnail", "small", "medium", "large". */
  name: string;
  /** Storage object key used for deletion and lookup. */
  key: string;
  /** Public URL for the variant file. */
  url: string;
  /** Variant width in pixels. */
  width: number;
  /** Variant height in pixels. */
  height: number;
  /** Variant file size in bytes. */
  size: number;
  /** MIME type of the generated variant. */
  mimetype: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  /** Storage object key/path used by the configured storage adapter. */
  storage_key: string | null;
  /** Original image width in pixels, when available. */
  width: number | null;
  /** Original image height in pixels, when available. */
  height: number | null;
  /** Generated image variants/thumbnails. Empty for non-image media. */
  variants: MediaVariant[];
  uploader_id: string;
  created_at: string;
}

export interface UploadMediaInput {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Uint8Array;
}
