export type UiLocale = 'en' | 'fr';

export function parseUiLocale(raw: unknown): UiLocale {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return v === 'fr' || v.startsWith('fr-') ? 'fr' : 'en';
}

export function localeHome(locale: UiLocale): string {
  return locale === 'fr' ? '/fr/' : '/';
}

export function localizedPath(path: string, locale: UiLocale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'fr') {
    if (clean === '/' || clean === '') return '/fr/';
    if (clean.startsWith('/fr/') || clean === '/fr') return clean;
    return `/fr${clean}`;
  }
  if (clean === '/fr' || clean === '/fr/') return '/';
  if (clean.startsWith('/fr/')) return clean.slice(3) || '/';
  return clean;
}

export function formatEuro(amount: number, locale: UiLocale): string {
  const n = Math.round(Number(amount) || 0);
  if (locale === 'fr') {
    return `${new Intl.NumberFormat('fr-FR').format(n)}\u00a0€`;
  }
  return `€${n}`;
}

type LocalUi = {
  lang: UiLocale;
  langNav: string;
  getApp: string;
  creatorNotFoundTitle: string;
  creatorNotFoundDesc: string;
  localCreator: string;
  verifiedLocal: string;
  about: string;
  routes: string;
  whatTravelersSay: string;
  viewRoute: string;
  follow: string;
  following: string;
  save: string;
  wantPersonal: string;
  personalLede: (firstName: string) => string;
  checklistLocal: string;
  checklist24h: string;
  checklistInteractive: string;
  checklistFood: string;
  ctaNote: string;
  fromPrice: (price: string) => string;
  createPersonalTrip: string;
  emptyRoutes: (firstName: string) => string;
  day: (n: number) => string;
  places: (n: number) => string;
  routeWord: (n: number) => string;
  follower: (n: number) => string;
  traveler: (n: number) => string;
  review: (n: number) => string;
  specialties: string;
  footTag: string;
  outOf5: (n: number) => string;
  defaultTraveler: string;
  fallbackTaglineCity: (city: string) => string;
  fallbackTagline: string;
  fallbackBio: (city: string) => string;
};

type RouteUi = {
  lang: UiLocale;
  langNav: string;
  getApp: string;
  notFoundTitle: string;
  notFoundDesc: string;
  localRoute: string;
  from: string;
  places: (n: number) => string;
  day: (n: number) => string;
  hint: string;
  openInMapica: string;
};

const LOCAL_EN: LocalUi = {
  lang: 'en',
  langNav: 'Language',
  getApp: 'Get the app',
  creatorNotFoundTitle: 'Creator not found',
  creatorNotFoundDesc: 'This Mapica creator page may be unpublished or the link is incorrect.',
  localCreator: 'Local Creator',
  verifiedLocal: '✓ Verified local',
  about: 'About',
  routes: 'Routes',
  whatTravelersSay: 'What travelers say',
  viewRoute: 'View route →',
  follow: 'Follow',
  following: 'Following',
  save: 'Save',
  wantPersonal: 'Want something made just for you?',
  personalLede: (firstName) =>
    `A personal route created by ${firstName} around your dates, interests and travel style.`,
  checklistLocal: '✓ Made by a local',
  checklist24h: '✓ Delivered within 24 hours',
  checklistInteractive: '✓ Interactive Mapica route',
  checklistFood: '✓ Restaurants & hidden places included',
  ctaNote: "Your local builds the route — they don't travel with you in person.",
  fromPrice: (price) => `From ${price}`,
  createPersonalTrip: 'Create my personal trip',
  emptyRoutes: (firstName) =>
    `No published routes yet. Ask ${firstName} for a personal route.`,
  day: (n) => `${n} day${n === 1 ? '' : 's'}`,
  places: (n) => `${n} places`,
  routeWord: (n) => `${n} route${n === 1 ? '' : 's'}`,
  follower: (n) => `${n} follower${n === 1 ? '' : 's'}`,
  traveler: (n) => `${n} traveler${n === 1 ? '' : 's'}`,
  review: (n) => `${n} review${n === 1 ? '' : 's'}`,
  specialties: 'Specialties',
  footTag: 'Travel like you know someone there.',
  outOf5: (n) => `${n} out of 5`,
  defaultTraveler: 'Traveler',
  fallbackTaglineCity: (city) =>
    `Living in ${city} and sharing routes through places I actually love.`,
  fallbackTagline: 'Routes through places I recommend to friends.',
  fallbackBio: (city) =>
    `Living in ${city} and exploring it beyond the obvious places. I create slow routes through coastal villages, local markets, viewpoints and places I recommend to friends.`,
};

const LOCAL_FR: LocalUi = {
  lang: 'fr',
  langNav: 'Langue',
  getApp: "Télécharger l'app",
  creatorNotFoundTitle: 'Créateur introuvable',
  creatorNotFoundDesc:
    'Cette page créateur Mapica est peut-être dépubliée ou le lien est incorrect.',
  localCreator: 'Local Creator',
  verifiedLocal: '✓ Local vérifié',
  about: 'À propos',
  routes: 'Parcours',
  whatTravelersSay: 'Ce que disent les voyageurs',
  viewRoute: 'Voir le parcours →',
  follow: 'Suivre',
  following: 'Abonné',
  save: 'Enregistrer',
  wantPersonal: 'Envie de quelque chose rien que pour vous\u00a0?',
  personalLede: (firstName) =>
    `Un parcours personnalisé créé par ${firstName} selon vos dates, centres d'intérêt et façon de voyager.`,
  checklistLocal: '✓ Créé par un Local',
  checklist24h: '✓ Livré sous 24 heures',
  checklistInteractive: '✓ Parcours interactif Mapica',
  checklistFood: '✓ Restaurants et bonnes adresses inclus',
  ctaNote:
    "Votre Local construit le parcours — il ne vous accompagne pas physiquement pendant le voyage.",
  fromPrice: (price) => `À partir de ${price}`,
  createPersonalTrip: 'Créer mon voyage personnalisé',
  emptyRoutes: (firstName) =>
    `Aucun parcours publié pour le moment. Demandez à ${firstName} un parcours personnalisé.`,
  day: (n) => `${n} jour${n === 1 ? '' : 's'}`,
  places: (n) => `${n} lieu${n === 1 ? '' : 'x'}`,
  routeWord: (n) => `${n} parcours`,
  follower: (n) => `${n} abonné${n === 1 ? '' : 's'}`,
  traveler: (n) => `${n} voyageur${n === 1 ? '' : 's'}`,
  review: (n) => `${n} avis`,
  specialties: 'Spécialités',
  footTag: 'Voyagez comme si vous connaissiez quelqu’un sur place.',
  outOf5: (n) => `${n} sur 5`,
  defaultTraveler: 'Voyageur',
  fallbackTaglineCity: (city) =>
    `Je vis à ${city} et je partage des parcours dans des lieux que j’aime vraiment.`,
  fallbackTagline: 'Des parcours dans des lieux que je recommande à mes amis.',
  fallbackBio: (city) =>
    `Je vis à ${city} et je l’explore au-delà des lieux évidents. Je crée des parcours tranquilles entre villages côtiers, marchés locaux, belvédères et adresses que je recommande à mes amis.`,
};

const ROUTE_EN: RouteUi = {
  lang: 'en',
  langNav: 'Language',
  getApp: 'Get the app',
  notFoundTitle: 'Route not found',
  notFoundDesc: 'This Mapica route may have been unpublished or the link is incorrect.',
  localRoute: 'Local route',
  from: 'from',
  places: (n) => `${n} places`,
  day: (n) => `${n} day${n === 1 ? '' : 's'}`,
  hint: 'Exact stops and local tips unlock in the app after purchase.',
  openInMapica: 'Open in Mapica',
};

const ROUTE_FR: RouteUi = {
  lang: 'fr',
  langNav: 'Langue',
  getApp: "Télécharger l'app",
  notFoundTitle: 'Parcours introuvable',
  notFoundDesc:
    'Ce parcours Mapica a peut-être été dépublié ou le lien est incorrect.',
  localRoute: 'Parcours Local',
  from: 'à partir de',
  places: (n) => `${n} lieu${n === 1 ? '' : 'x'}`,
  day: (n) => `${n} jour${n === 1 ? '' : 's'}`,
  hint: "Les étapes précises et les conseils du Local se débloquent dans l'app après l'achat.",
  openInMapica: 'Ouvrir dans Mapica',
};

export function localUi(locale: UiLocale): LocalUi {
  return locale === 'fr' ? LOCAL_FR : LOCAL_EN;
}

export function routeUi(locale: UiLocale): RouteUi {
  return locale === 'fr' ? ROUTE_FR : ROUTE_EN;
}

export function langSwitchHtml(
  enHref: string,
  frHref: string,
  locale: UiLocale,
  ariaLabel: string,
): string {
  const enCurrent = locale === 'en' ? ' aria-current="true"' : '';
  const frCurrent = locale === 'fr' ? ' aria-current="true"' : '';
  return `<nav class="lang-switch" aria-label="${ariaLabel}">
      <a href="${enHref}" data-locale="en"${enCurrent}>EN</a>
      <span aria-hidden="true"> · </span>
      <a href="${frHref}" data-locale="fr"${frCurrent}>FR</a>
    </nav>`;
}
