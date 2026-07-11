// Room ID from the current URL — the room ID doubles as the access key.
export function getRoomId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("room");
}
