export type LocalRouteCard = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  price_eur: number;
  cover_image_url: string | null;
  city: string | null;
  country: string | null;
  duration_days: number;
  public_url: string;
};

export type LocalPreviewOg = {
  title: string;
  description: string;
  image: string | null;
  url: string;
  type: string;
};

export type LocalPreview = {
  id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  country_name: string | null;
  about: string;
  languages: string[];
  completed_trips: number;
  route_count: number;
  routes: LocalRouteCard[];
  public_url: string;
  og: LocalPreviewOg;
};

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
  local_id?: string | null;
  local_slug?: string | null;
  place_count: number;
  walking_km: number;
  estimated_hours: number;
  public_url: string;
  og: RoutePreviewOg;
};
