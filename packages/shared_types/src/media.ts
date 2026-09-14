export interface MediaItem {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  uploader_id: string;
  created_at: string;
}

export interface UploadMediaInput {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Uint8Array;
}
