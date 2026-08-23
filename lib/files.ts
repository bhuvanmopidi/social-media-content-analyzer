export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/bmp",
] as const;

export const ACCEPT_ATTR = ".pdf,.png,.jpg,.jpeg,.webp,.bmp";

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return `Unsupported file type. Upload a PDF or an image (PNG, JPG, WebP, BMP).`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File is ${formatBytes(file.size)}. Maximum is ${formatBytes(MAX_FILE_BYTES)}.`;
  }
  if (file.size === 0) return "File is empty.";
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const isPdf = (file: File) => file.type === "application/pdf";