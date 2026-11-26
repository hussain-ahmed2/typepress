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

export interface ProcessedImageUpload {
  buffer: Buffer;
  width: number | undefined;
  height: number | undefined;
  format: string | undefined;
}

/** Specification for a named image variant generated on upload. */
export interface ImageVariantSpec {
  name: string;
  width: number;
  height: number;
  fit: 'cover' | 'inside';
}

/** Generated image variant payload ready for storage. */
export interface GeneratedImageVariant {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  mimetype: 'image/webp';
  format: 'webp';
}

/** Default responsive/thumbnail variants generated for raster image uploads. */
export const IMAGE_VARIANT_SPECS: readonly ImageVariantSpec[] = [
  { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
  { name: 'small', width: 320, height: 320, fit: 'inside' },
  { name: 'medium', width: 768, height: 768, fit: 'inside' },
  { name: 'large', width: 1280, height: 1280, fit: 'inside' },
] as const;

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
   * Generate named image variants for storage.
   *
   * Variants are encoded as WebP for compact delivery. Resizing never enlarges
   * beyond the source dimensions, and variant dimensions reflect actual output.
   */
  async generate_variants(
    buffer: Buffer,
    specs: readonly ImageVariantSpec[] = IMAGE_VARIANT_SPECS,
  ): Promise<GeneratedImageVariant[]> {
    const variants: GeneratedImageVariant[] = [];

    for (const spec of specs) {
      const { data, info } = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize({
          width: spec.width,
          height: spec.height,
          fit: spec.fit,
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });

      variants.push({
        name: spec.name,
        buffer: data,
        width: info.width,
        height: info.height,
        size: info.size,
        mimetype: 'image/webp',
        format: 'webp',
      });
    }

    return variants;
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

  /**
   * Process an uploaded image for storage.
   *
   * - Auto-rotates based on EXIF orientation.
   * - Constrains very large images to a max bounding box to reduce storage/bandwidth.
   * - Returns normalized buffer and metadata for validation/auditing.
   */
  async process_upload_image(buffer: Buffer, max_dimension = 4096): Promise<ProcessedImageUpload> {
    const pipeline = sharp(buffer, { failOn: 'none' }).rotate();
    const metadata = await pipeline.metadata();

    // Resize only when image exceeds max bounds; preserve aspect ratio and avoid enlarging.
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const should_resize = width > max_dimension || height > max_dimension;

    const normalized_pipeline = should_resize
      ? sharp(buffer, { failOn: 'none' })
          .rotate()
          .resize({
            width: max_dimension,
            height: max_dimension,
            fit: 'inside',
            withoutEnlargement: true,
          })
      : sharp(buffer, { failOn: 'none' }).rotate();

    const { data, info } = await normalized_pipeline.toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      width: info.width,
      height: info.height,
      format: info.format,
    };
  }
}

export const image_service = new ImageService();
