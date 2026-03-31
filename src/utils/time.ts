export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}
