import { useState, useEffect, useCallback } from 'react';

export interface UploadedPhoto {
  filename: string;
  originalName: string;
  url: string;
  uploadedAt: string;
  takenAt: string | null;      // EXIF date (null if no metadata)
  isPreview: boolean;
  featuredOrder: 1 | 2 | 3 | null;
}

export function usePhotos(cityName: string | null) {
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchPhotos = useCallback(async () => {
    if (!cityName) { setUploadedPhotos([]); return; }
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(cityName)}`);
      const data = await res.json();
      setUploadedPhotos((data.photos || []).map((p: any) => ({
        ...p,
        takenAt: p.takenAt ?? null,
        isPreview: !!p.isPreview,
        featuredOrder: p.featuredOrder ?? null,
      })));
    } catch (err) {
      console.error('Failed to load photos:', err);
    }
  }, [cityName]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const uploadPhotos = useCallback((files: FileList | File[]) => {
    if (!cityName) return;
    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('photos', file));

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success) {
          setUploadedPhotos(prev => [
            ...prev,
            ...data.photos.map((p: any) => ({
              ...p,
              takenAt: p.takenAt ?? null,
              isPreview: false,
              featuredOrder: null,
            })),
          ]);
        }
      } catch (err) { console.error('Upload parse error:', err); }
      setLoading(false);
      setUploadProgress(0);
    };

    xhr.onerror = () => { console.error('Upload failed'); setLoading(false); setUploadProgress(0); };
    xhr.open('POST', `/api/photos/${encodeURIComponent(cityName)}`);
    xhr.send(formData);
  }, [cityName]);

  const deletePhoto = useCallback(async (filename: string) => {
    if (!cityName) return;
    try {
      await fetch(`/api/photos/${encodeURIComponent(cityName)}/${filename}`, { method: 'DELETE' });
      setUploadedPhotos(prev => prev.filter(p => p.filename !== filename));
    } catch (err) { console.error('Delete failed:', err); }
  }, [cityName]);

  // Toggle preview or featured slot
  const setPhotoRole = useCallback(async (
    filename: string,
    role: 'preview' | 'featured',
    value: boolean | 1 | 2 | 3 | null,
  ) => {
    if (!cityName) return;

    const body: Record<string, unknown> = {};
    if (role === 'preview') body.isPreview = value;
    if (role === 'featured') body.featuredOrder = value;

    try {
      await fetch(`/api/photos/${encodeURIComponent(cityName)}/${filename}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) { console.error('setPhotoRole failed:', err); return; }

    // Optimistic local update
    setUploadedPhotos(prev => prev.map(p => {
      if (role === 'preview') {
        if (p.filename === filename) return { ...p, isPreview: value as boolean };
        return { ...p, isPreview: false }; // only one preview at a time
      }
      if (role === 'featured') {
        const order = value as 1 | 2 | 3 | null;
        if (p.filename === filename) return { ...p, featuredOrder: order };
        // Evict the slot if another photo held it
        if (order !== null && p.featuredOrder === order) return { ...p, featuredOrder: null };
        return p;
      }
      return p;
    }));
  }, [cityName]);

  return { uploadedPhotos, uploadPhotos, deletePhoto, loading, uploadProgress, setPhotoRole };
}
