import imageCompression from 'browser-image-compression';

export interface CompressImageOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

export async function compressImage(file: File, options?: CompressImageOptions): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 0.19, // ~195 KB, well below 200 KB target
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/jpeg',
    ...options,
  };

  try {
    const compressedBlob = await imageCompression(file, defaultOptions);
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Image compression failed, fallback to original:', error);
    return file;
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
