export function pad(p: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${p}`;
}
