export type SiteEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SITE_URL?: string;
  APP_STORE_URL?: string;
  PLAY_STORE_URL?: string;
};

export function readEnv(source?: Record<string, string | undefined>): SiteEnv {
  const from = source ?? (typeof process !== 'undefined' ? process.env : {});
  return {
    SUPABASE_URL: from.SUPABASE_URL,
    SUPABASE_ANON_KEY: from.SUPABASE_ANON_KEY,
    SITE_URL: from.SITE_URL,
    APP_STORE_URL: from.APP_STORE_URL,
    PLAY_STORE_URL: from.PLAY_STORE_URL,
  };
}
