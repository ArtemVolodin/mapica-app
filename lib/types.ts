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
  place_count: number;
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
  handle: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  country_id: string | null;
  country_name: string | null;
  about: string;
  languages: string[];
  regions: string[];
  expertise: string[];
  completed_trips: number;
  show_travelers: boolean;
  rating: number;
  route_count: number;
  routes: LocalRouteCard[];
  public_url: string;
  verified: boolean;
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
  local_handle?: string | null;
  place_count: number;
  walking_km: number;
  estimated_hours: number;
  public_url: string;
  og: RoutePreviewOg;
};
