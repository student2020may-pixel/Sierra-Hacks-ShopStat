// Phone photos are often 3–8 MB, but serverless hosts cap request bodies (~4.5 MB on Vercel),
// and the model doesn't need more than ~2000px to read a scorecard. Downscale before upload.

const MAX_DIMENSION = 2000;
const RESIZE_ABOVE_BYTES = 1.5 * 1024 * 1024;

/** Returns a smaller JPEG for large images; returns the original file if it's small, not an image, or can't be decoded. */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size <= RESIZE_ABOVE_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // Let the server decide (it falls back to the sample scorecard if the AI can't read it).
  }
}
