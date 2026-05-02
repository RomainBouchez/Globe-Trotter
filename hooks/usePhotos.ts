import { useState, useEffect, useCallback } from 'react';

interface UploadedPhoto {
  filename: string;
  originalName: string;
  url: string;
  uploadedAt: string;
}

export function usePhotos(cityName: string | null) {
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!cityName) {
      setUploadedPhotos([]);
      return;
    }
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(cityName)}`);
      const data = await res.json();
      setUploadedPhotos(data.photos || []);
    } catch (err) {
      console.error('Failed to load photos:', err);
    }
  }, [cityName]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const uploadPhotos = useCallback(async (files: FileList | File[]) => {
    if (!cityName) return;
    setLoading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('photos', file));

    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(cityName)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadedPhotos(prev => [...prev, ...data.photos]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  }, [cityName]);

  const deletePhoto = useCallback(async (filename: string) => {
    if (!cityName) return;
    try {
      await fetch(`/api/photos/${encodeURIComponent(cityName)}/${filename}`, {
        method: 'DELETE',
      });
      setUploadedPhotos(prev => prev.filter(p => p.filename !== filename));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [cityName]);

  return { uploadedPhotos, uploadPhotos, deletePhoto, loading };
}
