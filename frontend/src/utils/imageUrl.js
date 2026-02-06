// Backend URL for image serving
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

// Helper to construct full image URLs via backend
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // If already a full URL (Cloudinary or external), return as-is
  if (imagePath.startsWith('http')) return imagePath;
  
  // If it's a file:// URL, extract the filename and use relative path
  if (imagePath.startsWith('file://')) {
    const filename = imagePath.split('/').pop();
    return `${BACKEND_URL}/uploads/${filename}`;
  }
  
  // If it contains an absolute Windows path (D:/...), extract the filename
  if (imagePath.includes('D:/') || imagePath.includes('D:\\')) {
    const filename = imagePath.split(/[\\/]/).pop();
    return `${BACKEND_URL}/uploads/${filename}`;
  }
  
  // If local path starting with /uploads, prepend backend domain
  if (imagePath.startsWith('/uploads/')) return `${BACKEND_URL}${imagePath}`;
  
  // If local path starting with /, prepend backend domain
  if (imagePath.startsWith('/')) return `${BACKEND_URL}${imagePath}`;
  
  // Otherwise assume it's a relative path in uploads folder
  return `${BACKEND_URL}/uploads/${imagePath}`;
};

export default getImageUrl;
