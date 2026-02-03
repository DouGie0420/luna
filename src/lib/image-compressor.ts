
'use client';

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const MAX_SIZE_KB = 800;
const MAX_INPUT_SIZE_MB = 50;

/**
 * Compresses an image file to a data URL string.
 * It resizes the image to 1080p and compresses it to be under 800KB.
 * @param file The image file to compress.
 * @returns A promise that resolves with the compressed image as a data URL.
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_INPUT_SIZE_MB * 1024 * 1024) {
      return reject(new Error(`File size exceeds ${MAX_INPUT_SIZE_MB}MB limit.`));
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Resize logic to 1080p
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Compression logic to under 800KB
        const tryCompress = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Failed to create blob from canvas.'));
              }
              
              if (blob.size / 1024 <= MAX_SIZE_KB || quality <= 0.1) {
                // Convert final blob to data URL
                const blobReader = new FileReader();
                blobReader.readAsDataURL(blob);
                blobReader.onloadend = () => {
                  resolve(blobReader.result as string);
                };
                blobReader.onerror = () => reject(new Error('Failed to convert blob to data URL.'));
              } else {
                // Try again with lower quality
                tryCompress(quality - 0.1);
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress(0.9); // Start with 90% quality
      };
      img.onerror = (error) => {
        reject(error);
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}
