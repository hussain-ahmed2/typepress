/**
 * Image Service — Server-side image processing with Sharp.
 *
 * Features:
 *   - Resize images to specified dimensions
 *   - Generate thumbnails (150x150, 300x300, 600x600)
 *   - Apply filters (grayscale, sepia, blur)
 *   - Crop images
 *   - Convert between formats (jpeg, png, webp)
 *   - Get image metadata
 */
import sharp from 'sharp';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
}

export interface ThumbnailSizes {
  sm: { width: 150; height: 150 };
  md: { width: 300; height: 300 };
  lg: { width: 600; height: 600 };
}

const THUMBNAIL_SIZES: ThumbnailSizes = {
  sm: { width: 150, height: 150 },
  md: { width: 300, height: 300 },
  lg: { width: 600, height: 600 },
};

export class ImageService {
  /**
   * Resize an image buffer to specified dimensions.
   */
  async resize(buffer: Buffer, options: ImageTransformOptions): Promise<Buffer> {
    let pipeline = sharp(buffer);

    if (options.width || options.height) {
      pipeline = pipeline.resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        position: options.position || 'center',
      });
    }

    if (options.format) {
      pipeline = pipeline.toFormat(options.format, { quality: options.quality || 80 });
    }

    return pipeline.toBuffer();
  }

  /**
   * Generate all thumbnail sizes for an image.
   */
  async generate_thumbnails(buffer: Buffer): Promise<Record<string, Buffer>> {
    const thumbnails: Record<string, Buffer> = {};

    for (const [size_name, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
      thumbnails[size_name] = await sharp(buffer)
        .resize(dimensions.width, dimensions.height, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    return thumbnails;
  }

  /**
   * Apply a filter to an image.
   */
  async apply_filter(buffer: Buffer, filter: 'grayscale' | 'sepia' | 'blur' | 'sharpen'): Promise<Buffer> {
    let pipeline = sharp(buffer);

    switch (filter) {
      case 'grayscale':
        pipeline = pipeline.grayscale();
        break;
      case 'sepia':
        pipeline = pipeline.modulate({ brightness: 1.1, hue: 30 });
        break;
      case 'blur':
        pipeline = pipeline.blur(5);
        break;
      case 'sharpen':
        pipeline = pipeline.sharpen();
        break;
    }

    return pipeline.toBuffer();
  }

  /**
   * Crop an image to specified dimensions.
   */
  async crop(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    return sharp(buffer)
      .extract({
        width,
        height,
        left: 0,
        top: 0,
      })
      .toBuffer();
  }

  /**
   * Convert image format.
   */
  async convert(buffer: Buffer, format: 'jpeg' | 'png' | 'webp' | 'avif', quality = 80): Promise<Buffer> {
    return sharp(buffer)
      .toFormat(format, { quality })
      .toBuffer();
  }

  /**
   * Get image metadata (dimensions, format, size, etc.).
   */
  async get_metadata(buffer: Buffer) {
    return sharp(buffer).metadata();
  }
}

export const image_service = new ImageService();
