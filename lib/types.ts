export type RoutePreviewOg = {
  title: string;
  description: string;
  image: string | null;
  url: string;
  type: string;
};

export type RoutePreview = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  price_eur: number;
  cover_image_url: string | null;
  city: string | null;
  country: string | null;
  destination: string;
  duration_days: number;
  local_display_name: string;
  place_count: number;
  walking_km: number;
  estimated_hours: number;
  public_url: string;
  og: RoutePreviewOg;
};
