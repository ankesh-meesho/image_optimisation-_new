import Pica from 'pica';
import { ssimResult } from './ssimResult';

const pica = new Pica();

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
    const sourceImage = new Image();
    const sourceUrl = URL.createObjectURL(file);
    sourceImage.src = sourceUrl;
    await new Promise((resolve, reject) => {
        sourceImage.onload = resolve;
        sourceImage.onerror = reject;
    });
    URL.revokeObjectURL(sourceUrl);

    const destCanvas = document.createElement('canvas');
    let targetWidth = sourceImage.width;
    let targetHeight = sourceImage.height;

    if (options.maxWidth && sourceImage.width > options.maxWidth) {
        const aspectRatio = sourceImage.width / sourceImage.height;
        targetWidth = options.maxWidth;
        targetHeight = targetWidth / aspectRatio;
    }
    
    destCanvas.width = targetWidth;
    destCanvas.height = targetHeight;
    
    await pica.resize(sourceImage, destCanvas, {
      alpha: true,
      unsharpAmount: 160,
      unsharpRadius: 0.6,
      unsharpThreshold: 1,
    });
    
    const outputQuality = options.quality !== undefined ? options.quality : 1;

    const blob = await pica.toBlob(destCanvas, options.fileType, outputQuality);

    return new File([blob], file.name, { type: options.fileType });
  } catch (error) {
    console.error(`Error processing to ${options.fileType || 'original'} format:`, error);
    throw new Error(`Failed to convert to ${options.fileType}: ${error.message}`);
  }
};

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

  const processingPromises = targetFormats.map(target => {
    const options = {
      fileType: target.format,
      maxWidth: needsResizing ? maxWidth : undefined,
      quality: 0.99, 
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

  const resultsWithQualityPromises = successfulResults.map(async (result) => {
    try {
      const ssimScore = await ssimResult(file, result.file);
      return { ...result, ssimResult: ssimScore };
    } catch (error) {
      console.error(`Could not calculate SSIM for ${result.label}:`, error);
      return { ...result, ssimResult: 'Error' };
    }
  });

  const finalResults = await Promise.all(resultsWithQualityPromises);
  return finalResults;
};