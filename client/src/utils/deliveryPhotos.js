import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export const MAX_DELIVERY_PHOTOS = 6;

// Resize to ≤1600px and re-encode as JPEG. Drawing to a canvas also drops EXIF (incl. GPS) and
// bakes in the phone's rotation, so the stored photo is small, upright and metadata-free.
export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This browser can't read that photo — try a JPEG or take it with the camera."));
    };
    img.src = url;
  });
}

// Resize + upload photos for one delivery, one at a time. Calls onProgress(done, total) after
// each. Returns the new photo ids; throws (with the server's message) on the first failure.
export async function uploadDeliveryPhotos(orderId, files, token, onProgress = () => {}) {
  const ids = [];
  const list = Array.from(files);
  // eslint-disable-next-line no-restricted-syntax
  for (const file of list) {
    // eslint-disable-next-line no-await-in-loop
    const dataUrl = await resizePhoto(file);
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await axios.post(
        `${API_URL}/api/deliveries/${orderId}/photos`,
        { dataUrl },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      ids.push(res.data.photoId);
      onProgress(ids.length, list.length);
    } catch (err) {
      const e = new Error(err.response?.data?.error || 'Upload failed — check your connection.');
      e.uploadedIds = ids;
      throw e;
    }
  }
  return ids;
}
