import type { RoutePreview } from './types';

const PARIS =
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80';
const ITALY =
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1600&q=80';
const TRAVEL =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80';

export function coverUrl(preview: RoutePreview): string {
  if (preview.cover_image_url) return preview.cover_image_url;
  const d = (preview.destination || preview.city || '').toLowerCase();
  if (d.includes('paris')) return PARIS;
  if (
    d.includes('nice') ||
    d.includes('liguria') ||
    d.includes('italy') ||
    d.includes('cinque')
  ) {
    return ITALY;
  }
  return TRAVEL;
}
