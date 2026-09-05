import { useEffect, useState } from 'react';
import type { DanmakuItem } from '../../types';

interface DanmakuOverlayProps {
  danmakuList: DanmakuItem[];
  currentTime: number;
  enabled: boolean;
  opacity?: number;
  fontSize?: number;
}

interface ActiveBullet {
  id: string;
  text: string;
  color: string;
  position: 'scroll' | 'top' | 'bottom';
  topPercent: number;
  startTime: number;
}

export function DanmakuOverlay({
  danmakuList,
  currentTime,
  enabled,
  opacity = 0.9,
  fontSize = 18,
}: DanmakuOverlayProps) {
  const [activeBullets, setActiveBullets] = useState<ActiveBullet[]>([]);

  // Filter bullets that should appear within a 2-second window of currentTime
  useEffect(() => {
    if (!enabled) {
      setActiveBullets([]);
      return;
    }

    const currentMatches = danmakuList.filter(
      (d) => Math.abs(d.time_seconds - currentTime) < 0.8
    );

    if (currentMatches.length === 0) return;

    setActiveBullets((prev) => {
      const existingIds = new Set(prev.map((b) => b.id));
      const newOnes: ActiveBullet[] = [];

      currentMatches.forEach((d, idx) => {
        const uniqueId = `${d.id || d.text}-${Math.floor(currentTime)}`;
        if (!existingIds.has(uniqueId)) {
          // Distribute tracks between 8% and 75% height
          const track = ((prev.length + idx) % 7) * 10 + 10;
          newOnes.push({
            id: uniqueId,
            text: d.text,
            color: d.color || '#ffffff',
            position: d.position || 'scroll',
            topPercent: track,
            startTime: Date.now(),
          });
        }
      });

      // Keep recent bullets and purge old ones
      const now = Date.now();
      const kept = [...prev, ...newOnes].filter((b) => now - b.startTime < 7500);
      return kept;
    });
  }, [currentTime, enabled, danmakuList]);

  if (!enabled || activeBullets.length === 0) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-20 select-none"
      style={{ opacity }}
    >
      {activeBullets.map((bullet) => {
        if (bullet.position === 'top') {
          return (
            <div
              key={bullet.id}
              className="absolute left-1/2 -translate-x-1/2 font-bold px-3 py-1 bg-black/40 rounded-full shadow-lg"
              style={{
                top: `${bullet.topPercent}%`,
                color: bullet.color,
                fontSize: `${fontSize}px`,
                textShadow: '0 2px 4px rgba(0,0,0,0.9)',
              }}
            >
              {bullet.text}
            </div>
          );
        }

        if (bullet.position === 'bottom') {
          return (
            <div
              key={bullet.id}
              className="absolute left-1/2 -translate-x-1/2 bottom-12 font-bold px-3 py-1 bg-black/40 rounded-full shadow-lg"
              style={{
                color: bullet.color,
                fontSize: `${fontSize}px`,
                textShadow: '0 2px 4px rgba(0,0,0,0.9)',
              }}
            >
              {bullet.text}
            </div>
          );
        }

        // Standard scrolling bullet
        return (
          <div
            key={bullet.id}
            className="danmaku-item"
            style={{
              top: `${bullet.topPercent}%`,
              color: bullet.color,
              fontSize: `${fontSize}px`,
            }}
          >
            {bullet.text}
          </div>
        );
      })}
    </div>
  );
}
