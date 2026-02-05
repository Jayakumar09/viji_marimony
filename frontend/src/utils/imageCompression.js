/**
 * Compress image to less than 50KB
 * @param {File} file - Image file to compress
 * @param {number} maxSize - Maximum size in bytes (default: 50KB)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export const compressImage = (file, maxSize = 50 * 1024) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        const maxDimension = 800;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress by reducing quality progressively
        let quality = 0.9;
        canvas.toBlob(
          (blob) => {
            if (blob.size > maxSize && quality > 0.1) {
              quality -= 0.1;
              canvas.toBlob(
                (retryBlob) => {
                  if (retryBlob.size > maxSize && quality > 0.1) {
                    // Recursive compression
                    compressImage(file, maxSize).then(resolve).catch(reject);
                  } else {
                    resolve(retryBlob);
                  }
                },
                file.type || 'image/jpeg',
                quality
              );
            } else {
              resolve(blob);
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Convert blob to File object
 */
export const blobToFile = (blob, filename) => {
  return new File([blob], filename, { type: blob.type });
};
