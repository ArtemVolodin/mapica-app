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
  saves_count: number;
  route_rating: number | null;
  route_reviews_count: number;
  public_url: string;
};

export type CreatorReview = {
  id: string;
  rating: number;
  review_text: string;
  author_name: string;
  author_city: string | null;
  author_country: string | null;
  created_at: string;
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
  creator_id: string;
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
  instagram_url: string | null;
  instagram_username: string | null;
  followers_count: number;
  is_following: boolean;
  completed_trips: number;
  show_travelers: boolean;
  creator_rating: number | null;
  reviews_count: number;
  show_rating: boolean;
  total_saves: number;
  route_count: number;
  routes: LocalRouteCard[];
  reviews: CreatorReview[];
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
