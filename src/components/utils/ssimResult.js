/**
 * ssimResult.js (Main-Thread Version)
 * =====================================
 * WARNING: This implementation runs CPU-intensive calculations on the main
 * browser thread. This WILL FREEZE the user interface (UI) while the
 * SSIM score is being calculated. The page will become unresponsive.
 * This approach is NOT RECOMMENDED for a production environment. Use it only
 * for simple testing or debugging purposes where UI performance is not a concern.
 */

import { ssim } from 'ssim.js'; // Import the library directly

/**
 * A helper function to draw an image file onto an off-screen canvas
 * at specific dimensions and extract its raw pixel data (ImageData).
 */
const getImageDataFromFile = async (file, { width, height }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  const imageBitmap = await createImageBitmap(file);
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close(); // Release memory
  
  return ctx.getImageData(0, 0, width, height);
};

/**
 * Calculates the SSIM score between two images directly on the main thread.
 * @param {File} originalImageFile - The original, uncompressed image file.
 * @param {File} compressedImageFile - The modified, compressed image file.
 * @returns {Promise<number>} A promise that resolves with the SSIM score.
 */
export const ssimResult = async (originalImageFile, compressedImageFile) => {
  try {
    // 1. Validate inputs
    if (!originalImageFile || !compressedImageFile) {
      throw new Error("Two image files must be provided.");
    }

    // 2. Get the dimensions of the compressed image for comparison
    const imageBitmap = await createImageBitmap(compressedImageFile);
    const { width, height } = imageBitmap;
    imageBitmap.close();

    if (width === 0 || height === 0) {
      throw new Error("Compressed image has invalid dimensions (0x0).");
    }

    // 3. Get the raw pixel data for both images
    const [originalImageData, compressedImageData] = await Promise.all([
      getImageDataFromFile(originalImageFile, { width, height }),
      getImageDataFromFile(compressedImageFile, { width, height })
    ]);

    console.log("Preparing data for SSIM calculation (UI may freeze now)...");

    // 4. Prepare the data for the ssim function
    const image1 = {
      data: originalImageData.data,
      width: originalImageData.width,
      height: originalImageData.height,
    };
    const image2 = {
      data: compressedImageData.data,
      width: compressedImageData.width,
      height: compressedImageData.height,
    };
  
    // 5. Run the SSIM calculation directly. This is the blocking operation.
    const result = ssim(image1, image2);
    
    // 6. Return the final score
    return result.mssim;

  } catch (error) {
    console.error("SSIM calculation failed:", error);
    throw error;
  }
};