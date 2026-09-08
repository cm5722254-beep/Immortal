/**
 * Video Source Utility Helper for Video Player & Episode Management
 * Supports YouTube, Facebook, Google Drive, OK.ru, MP4, HLS, etc.
 */

// ─── YOUTUBE UTILS ───
export function parseYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // If user pasted an HTML iframe tag, extract the src URL
  const iframeMatch = cleanUrl.match(/src=["'](.*?)["']/i);
  const target = iframeMatch ? iframeMatch[1] : cleanUrl;

  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i,
    /^[a-zA-Z0-9_-]{11}$/ // raw 11-char ID
  ];

  for (const regex of patterns) {
    const match = target.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return parseYouTubeVideoId(url) !== null;
}

export function getYouTubeEmbedUrl(urlOrId: string, options: { autoplay?: boolean } = { autoplay: true }): string {
  const videoId = parseYouTubeVideoId(urlOrId) || urlOrId;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const autoplayParam = options.autoplay ? '1' : '0';
  return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplayParam}&enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&playsinline=1&modestbranding=1`;
}

export function getYouTubeThumbnail(urlOrId: string, quality: 'maxres' | 'hq' | 'mq' = 'hq'): string | null {
  const videoId = parseYouTubeVideoId(urlOrId);
  if (!videoId) return null;
  if (quality === 'maxres') return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  if (quality === 'mq') return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ─── FACEBOOK VIDEO UTILS ───
/**
 * Detects if a URL is a Facebook video URL:
 * - https://www.facebook.com/watch/?v=...
 * - https://www.facebook.com/.../videos/...
 * - https://fb.watch/...
 * - https://www.facebook.com/plugins/video.php?...
 * - <iframe src="https://www.facebook.com/plugins/video.php..."></iframe>
 */
export function isFacebookUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const cleanUrl = url.trim();
  const iframeMatch = cleanUrl.match(/src=["'](.*?)["']/i);
  const target = iframeMatch ? iframeMatch[1] : cleanUrl;
  return /facebook\.com\/(?:watch|.*\/videos|share\/v|reel|plugins\/video\.php)|fb\.watch\//i.test(target);
}

export function parseFacebookVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  const iframeMatch = cleanUrl.match(/src=["'](.*?)["']/i);
  const target = iframeMatch ? iframeMatch[1] : cleanUrl;

  // Match /videos/.../123456789 or /videos/123456789
  const videosMatch = target.match(/\/videos\/(?:[^\/?#]+\/)?(\d+)/i);
  if (videosMatch && videosMatch[1]) return videosMatch[1];

  // Match /watch/?v=123456789
  const watchMatch = target.match(/[?&]v=(\d+)/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // Match /reel/123456789
  const reelMatch = target.match(/\/reel\/(\d+)/i);
  if (reelMatch && reelMatch[1]) return reelMatch[1];

  return null;
}

export function getFacebookEmbedUrl(url: string, options: { autoplay?: boolean } = { autoplay: true }): string {
  if (!url) return '';
  const cleanUrl = url.trim();
  const iframeMatch = cleanUrl.match(/src=["'](.*?)["']/i);
  let target = iframeMatch ? iframeMatch[1] : cleanUrl;

  // If already an official Facebook embed plugin URL, return it
  if (target.includes('facebook.com/plugins/video.php')) {
    return target;
  }

  // If we can extract the numeric video ID, use the 100% reliable canonical watch URL
  const videoId = parseFacebookVideoId(target);
  if (videoId) {
    target = `https://www.facebook.com/watch/?v=${videoId}`;
  } else {
    // Strip tracking queries that break Facebook plugin embeds
    try {
      const parsed = new URL(target);
      target = `${parsed.origin}${parsed.pathname}`;
    } catch {}
  }

  // Otherwise convert to official Facebook Video Plugin URL
  const autoplayParam = options.autoplay ? '1' : '0';
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(target)}&show_text=0&autoplay=${autoplayParam}&width=auto`;
}
