import { compressImage } from './image-compressor';

/**
 * Upload a file to Cloudflare R2 via the server-side API route.
 * Images are compressed before upload. Videos/docs are uploaded as-is.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToR2(file: File, folder: string = 'uploads'): Promise<string> {
    const formData = new FormData();
    formData.append('folder', folder);

    if (file.type.startsWith('image/')) {
        const dataUrl = await compressImage(file);
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        formData.append('file', new File([blob], file.name, { type: 'image/jpeg' }));
    } else {
        formData.append('file', file);
    }

    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
    const { url } = await response.json();
    return url;
}
