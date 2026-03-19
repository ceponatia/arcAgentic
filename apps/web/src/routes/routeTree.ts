import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { RootLayout } from './RootLayout.js';
import {
  HomeLegacy,
  CharacterLibraryLegacy,
  CharacterStudioLegacy,
  CharacterStudioEditLegacy,
  SettingLibraryLegacy,
  SettingBuilderLegacy,
  SettingBuilderEditLegacy,
  TagLibraryLegacy,
  TagBuilderLegacy,
  TagBuilderEditLegacy,
  ItemLibraryLegacy,
  ItemBuilderLegacy,
  ItemBuilderEditLegacy,
  PersonaLibraryLegacy,
  PersonaBuilderLegacy,
  PersonaBuilderEditLegacy,
  LocationLibraryLegacy,
  LocationBuilderLegacy,
  SessionLibraryLegacy,
  SessionBuilderLegacy,
  ChatLegacy,
  DocsLegacy,
} from './LegacyRoutes.js';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeLegacy,
});

// Characters
const characterLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters',
  component: CharacterLibraryLegacy,
});

const characterStudioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/studio',
  component: CharacterStudioLegacy,
});

const characterStudioEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/studio/$id',
  component: CharacterStudioEditLegacy,
});

// Settings
const settingLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingLibraryLegacy,
});

const settingBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/builder',
  component: SettingBuilderLegacy,
});

const settingBuilderEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/builder/$id',
  component: SettingBuilderEditLegacy,
});

// Tags
const tagLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: TagLibraryLegacy,
});

const tagBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags/builder',
  component: TagBuilderLegacy,
});

const tagBuilderEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags/builder/$id',
  component: TagBuilderEditLegacy,
});

// Items
const itemLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items',
  component: ItemLibraryLegacy,
});

const itemBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items/builder',
  component: ItemBuilderLegacy,
});

const itemBuilderEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items/builder/$id',
  component: ItemBuilderEditLegacy,
});

// Personas
const personaLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/personas',
  component: PersonaLibraryLegacy,
});

const personaBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/personas/builder',
  component: PersonaBuilderLegacy,
});

const personaBuilderEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/personas/builder/$id',
  component: PersonaBuilderEditLegacy,
});

// Locations
const locationLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/locations',
  component: LocationLibraryLegacy,
});

const locationBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/locations/builder',
  component: LocationBuilderLegacy,
  validateSearch: (search: Record<string, unknown>) => ({
    mapId: typeof search['mapId'] === 'string' ? search['mapId'] : undefined,
    settingId: typeof search['settingId'] === 'string' ? search['settingId'] : undefined,
  }),
});

// Sessions
const sessionLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions',
  component: SessionLibraryLegacy,
});

const sessionBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/builder',
  component: SessionBuilderLegacy,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/$id/chat',
  component: ChatLegacy,
});

// Docs
const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/docs',
  component: DocsLegacy,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  characterLibraryRoute,
  characterStudioRoute,
  characterStudioEditRoute,
  settingLibraryRoute,
  settingBuilderRoute,
  settingBuilderEditRoute,
  tagLibraryRoute,
  tagBuilderRoute,
  tagBuilderEditRoute,
  itemLibraryRoute,
  itemBuilderRoute,
  itemBuilderEditRoute,
  personaLibraryRoute,
  personaBuilderRoute,
  personaBuilderEditRoute,
  locationLibraryRoute,
  locationBuilderRoute,
  sessionLibraryRoute,
  sessionBuilderRoute,
  chatRoute,
  docsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
