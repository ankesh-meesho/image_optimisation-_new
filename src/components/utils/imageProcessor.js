import imageCompression from 'browser-image-compression';
import { ssimResult } from './ssimResult';
// SECTION 1: HELPER UTILITIES
// These functions will support our main orchestration function.

const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = (err) => reject(err);
    img.src = URL.createObjectURL(file);
  });
};

const processImage = async (file, options) => {
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error(`Error processing to ${options.fileType || 'original'} format:`, error);
    throw new Error(`Failed to convert to ${options.fileType}: ${error.message}`);
  }
};

const getImageDataFromFile = async (file, { width, height }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  const img = await createImageBitmap(file);
  ctx.drawImage(img, 0, 0, width, height);
  img.close();
  
  return ctx.getImageData(0, 0, width, height);
};


// SECTION 2: MAIN ORCHESTRATION FUNCTION

/**
 * Takes one image, processes it into multiple formats, and calculates the
 * perceptual quality (SSIM score) for each successful conversion.
 */
export const generateImagePreviewsWithQuality = async (file, { maxWidth }) => {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Invalid file type.');
  }

  const originalSize = file.size;
  const originalFormat = file.type;
  const { width } = await getImageDimensions(file);
  const needsResizing = width > maxWidth;

  const targetFormats = [
    { format: 'image/jpeg', label: 'JPEG' },
    { format: 'image/webp', label: 'WebP' },
    { format: 'image/png', label: 'PNG' }
  ];

  // --- STAGE 1: Process all image format conversions in parallel ---
  const processingPromises = targetFormats.map(target => {
    const options = {
      useWebWorker: true,
      fileType: target.format,
      initialQuality: 1,
      ...(needsResizing && { maxWidthOrHeight: maxWidth }),
      ...(!needsResizing && { alwaysKeepResolution: true }),
    };
    return processImage(file, options);
  });

  const settledResults = await Promise.allSettled(processingPromises);

  const successfulResults = settledResults
    .filter(result => result.status === 'fulfilled')
    .map(result => {
      const newFile = result.value;
      const reduction = ((originalSize - newFile.size) / originalSize) * 100;
      return {
        file: newFile,
        format: newFile.type,
        label: `${targetFormats.find(f => f.format === newFile.type)?.label} ${newFile.type === originalFormat ? 'resized' : ''}` || 'Unknown',
        size: newFile.size,
        reduction: reduction,
        isOriginalFormat: newFile.type === originalFormat,
      };
    });

  settledResults.forEach(result => {
    if (result.status === 'rejected') {
      console.warn(result.reason);
    }
  });

  // --- STAGE 2: Calculate SSIM for each successful conversion in parallel ---
  const resultsWithQualityPromises = successfulResults.map(async (result) => {
    try {
      const ssimScore = await ssimResult(file, result.file);
      console.log('ssimScore', ssimScore);
      return { ...result, ssimResult: ssimScore };
    } catch (error) {
      console.error(`Could not calculate SSIM for ${result.label}:`, error);
      return { ...result, ssimResult: 'Error' }; // Attach error state
    }
  });

  const finalResults = await Promise.all(resultsWithQualityPromises);
  console.log('finalResults', finalResults);
  return finalResults;
};