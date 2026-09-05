import { useState, useCallback, useRef } from 'react';

interface AmbientColor {
  r: number;
  g: number;
  b: number;
}

interface UseAmbientGlowReturn {
  glowStyle: React.CSSProperties;
  extractColor: (imgSrc: string) => void;
  clearGlow: () => void;
  color: AmbientColor | null;
}

/**
 * Extracts the dominant color from an image URL using a canvas
 * and returns a CSS box-shadow / background glow style.
 */
export function useAmbientGlow(intensity: number = 0.35): UseAmbientGlowReturn {
  const [color, setColor] = useState<AmbientColor | null>(null);
  const cacheRef = useRef<Record<string, AmbientColor>>({});

  const extractColor = useCallback((imgSrc: string) => {
    if (!imgSrc) return;

    // Return cached result immediately
    if (cacheRef.current[imgSrc]) {
      setColor(cacheRef.current[imgSrc]);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Sample at small size for perf (16×24 for 2:3 poster ratio)
        canvas.width = 16;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 16, 24);
        const data = ctx.getImageData(0, 0, 16, 24).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2], pa = data[i + 3];
          if (pa < 128) continue; // skip transparent pixels
          // Skip near-black and near-white pixels for better color extraction
          const brightness = (pr + pg + pb) / 3;
          if (brightness < 20 || brightness > 235) continue;
          r += pr; g += pg; b += pb; count++;
        }

        if (count === 0) return;
        const extracted: AmbientColor = {
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        };
        cacheRef.current[imgSrc] = extracted;
        setColor(extracted);
      } catch {
        // Cross-origin canvas errors — silently fail
      }
    };
  }, []);

  const clearGlow = useCallback(() => setColor(null), []);

  const glowStyle: React.CSSProperties = color
    ? {
        boxShadow: `0 0 60px 20px rgba(${color.r}, ${color.g}, ${color.b}, ${intensity}), 0 0 120px 40px rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.4})`,
        transition: 'box-shadow 600ms cubic-bezier(0.16, 1, 0.3, 1)',
      }
    : { transition: 'box-shadow 400ms ease' };

  return { glowStyle, extractColor, clearGlow, color };
}
