/**
 * YouTube Utility Helper for Video Player & Episode Management
 * Supports all standard YouTube URL variations:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - <iframe src="https://www.youtube.com/embed/VIDEO_ID"></iframe>
 */

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
