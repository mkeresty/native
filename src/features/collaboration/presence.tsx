/** Deterministic per-user presence color (cursors, labels, avatars). */
const PRESENCE_COLORS = [
  "#e76f51",
  "#2a9d8f",
  "#457b9d",
  "#8e44ad",
  "#b5651d",
  "#5f8f3e",
  "#b04a5a",
  "#4a6fa5",
] as const;

export function presenceColor(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) | 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]!;
}

export function presenceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}
