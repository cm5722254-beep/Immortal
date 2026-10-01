export function getVipContactUrl(username?: string | null) {
  const message = `Hello, I would like to ask about Huang+ Premium. Username: ${username || 'Guest'}`;
  return `https://t.me/watchflixanimeadmin?text=${encodeURIComponent(message)}`;
}
