import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>('../../recepten/*.{jpg,jpeg,png,webp}', {
  eager: true,
});

export function fotoVoor(bestand?: string): ImageMetadata | undefined {
  if (bestand === undefined) return undefined;
  return modules[`../../recepten/${bestand}`]?.default;
}
