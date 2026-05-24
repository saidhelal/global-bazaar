import { useState, useCallback } from 'react';

const API_BASE = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '') + '/api';

export function useUploadImage() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const token = localStorage.getItem('orbit_token');
      // Step 1: request presigned URL
      const res = await fetch(`${API_BASE}/storage/uploads/request-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadURL, objectPath } = await res.json();

      // Step 2: upload directly to GCS with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error('Upload failed'));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('PUT', uploadURL);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setProgress(100);
      // Return the serving URL
      return `${API_BASE}/storage${objectPath}`;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return { uploadImage, isUploading, progress, error, reset };
}
