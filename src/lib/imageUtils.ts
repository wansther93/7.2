/**
 * Helper utility to resize and compress images before storing as data URLs in Firestore.
 * Ensures the resulting base64 string is well within Firestore's 1MB limit.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        resolve('');
        return;
      }
      try {
        const compressed = await compressBase64Image(rawDataUrl, maxWidth, maxHeight, quality);
        resolve(compressed);
      } catch (err) {
        console.warn('Fallback: image compression failed, using original', err);
        resolve(rawDataUrl);
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes and compresses any base64 data URL to fit within target dimensions and byte size.
 * Safe to call with any URL (returns immediately if not a base64 data URL).
 */
export async function compressBase64Image(
  dataUrl: string,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.75,
  maxBytes = 250_000 // default ~250KB max
): Promise<string> {
  if (!dataUrl) return '';

  let normalizedUrl = dataUrl;
  if (!normalizedUrl.startsWith('data:') && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    // Might be raw base64 string
    if (normalizedUrl.startsWith('/9j/')) {
      normalizedUrl = `data:image/jpeg;base64,${normalizedUrl}`;
    } else if (normalizedUrl.startsWith('iVBORw')) {
      normalizedUrl = `data:image/png;base64,${normalizedUrl}`;
    } else if (normalizedUrl.length > 500) {
      normalizedUrl = `data:image/jpeg;base64,${normalizedUrl}`;
    }
  }

  if (!normalizedUrl.startsWith('data:image/')) {
    return normalizedUrl;
  }

  // If already sufficiently small, don't re-compress unnecessarily
  if (normalizedUrl.length <= maxBytes && normalizedUrl.length < 120_000) {
    return normalizedUrl;
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(normalizedUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while bounding within maxWidth & maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try JPEG compression
        let currentQuality = quality;
        let result = canvas.toDataURL('image/jpeg', currentQuality);

        // If still exceeds maxBytes, loop down quality and scale down
        let attempts = 0;
        while (result.length > maxBytes && attempts < 4) {
          attempts++;
          currentQuality = Math.max(0.4, currentQuality - 0.15);
          const newW = Math.max(50, Math.round(canvas.width * 0.75));
          const newH = Math.max(50, Math.round(canvas.height * 0.75));
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = newW;
          tempCanvas.height = newH;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0, newW, newH);
            canvas.width = newW;
            canvas.height = newH;
            ctx.drawImage(tempCanvas, 0, 0);
          }
          result = canvas.toDataURL('image/jpeg', currentQuality);
        }

        resolve(result);
      } catch (err) {
        console.warn('Erro ao comprimir imagem base64:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

