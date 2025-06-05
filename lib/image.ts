export async function downscaleImage(
  file: File,
  maxSizeBytes = 1024 * 1024,
): Promise<File> {
  if (file.size <= maxSizeBytes) return file;

  const img = await loadImage(file);
  let canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  let quality = 0.9;
  let blob = await canvasToBlob(canvas, file.type, quality);

  // Reduce quality until under max size or quality too low
  while (blob.size > maxSizeBytes && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, file.type, quality);
  }

  // If still large, scale dimensions down proportionally
  if (blob.size > maxSizeBytes) {
    const ratio = Math.sqrt(maxSizeBytes / blob.size);
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, file.type, quality);
  }

  return new File([blob], file.name, { type: file.type });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), type, quality);
  });
}
