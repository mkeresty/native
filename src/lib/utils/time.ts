export function formatRelativeTime(date: Date | string | number): string {
  const then = new Date(date).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 45) return "just now";
  if (seconds < 90) return "a minute ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(date).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function readingTimeMinutes(markdown: string): number | null {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / 220));
}
