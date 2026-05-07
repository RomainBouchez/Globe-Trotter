import JSZip from 'jszip';

const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

export async function extractImagesFromZip(zipFile: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const images: File[] = [];

  const entries = Object.values(zip.files).filter(f => {
    if (f.dir) return false;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    return ext in IMAGE_TYPES;
  });

  await Promise.all(
    entries.map(async (entry) => {
      const blob = await entry.async('blob');
      const ext  = entry.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = IMAGE_TYPES[ext] ?? 'image/jpeg';
      const name = entry.name.split('/').pop() ?? entry.name;
      images.push(new File([blob], name, { type: mime }));
    })
  );

  return images;
}

export function isZipFile(file: File): boolean {
  return file.type === 'application/zip'
    || file.type === 'application/x-zip-compressed'
    || file.name.toLowerCase().endsWith('.zip');
}
