import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { RootLayout } from './RootLayout.js';
import { CharacterLibraryRoute } from './characters/CharacterLibraryRoute.js';
import { ItemBuilderRoute } from './items/ItemBuilderRoute.js';
import { ItemLibraryRoute } from './items/ItemLibraryRoute.js';
import { DocsRoute } from './docs/DocsRoute.js';
import { LocationBuilderRoute } from './locations/LocationBuilderRoute.js';
import { LocationLibraryRoute } from './locations/LocationLibraryRoute.js';
import { PersonaBuilderRoute } from './personas/PersonaBuilderRoute.js';
import { PersonaLibraryRoute } from './personas/PersonaLibraryRoute.js';
import { SessionLibraryRoute } from './sessions/SessionLibraryRoute.js';
import { SettingBuilderRoute } from './settings/SettingBuilderRoute.js';
import { SettingLibraryRoute } from './settings/SettingLibraryRoute.js';
import { TagBuilderRoute } from './tags/TagBuilderRoute.js';
import { TagLibraryRoute } from './tags/TagLibraryRoute.js';
import { HomeRoute } from './HomeRoute.js';
import { CharacterStudioRoute } from './characters/CharacterStudioRoute.js';
import { SessionBuilderRoute } from './sessions/SessionBuilderRoute.js';
import { ChatRoute } from './sessions/ChatRoute.js';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeRoute,
});

// Characters
const characterLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters',
  component: CharacterLibraryRoute,
});

const characterStudioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/studio',
  component: CharacterStudioRoute,
});

const characterStudioEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/studio/$id',
  component: CharacterStudioRoute,
});

// Settings
const settingLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingLibraryRoute,
});

const settingBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/builder',
  component: SettingBuilderRoute,
});

const settingBuilderEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/builder/$id',
  component: SettingBuilderRoute,
});

// Tags
const tagLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: TagLibraryRoute,
});

const tagBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags/builder',
  component: TagBuilderRoute,
});

const tagBuilderEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags/builder/$id',
  component: TagBuilderRoute,
});

// Items
const itemLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items',
  component: ItemLibraryRoute,
});

const itemBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items/builder',
  component: ItemBuilderRoute,
});

const itemBuilderEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items/builder/$id',
  component: ItemBuilderRoute,
});

// Personas
const personaLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/personas',
  component: PersonaLibraryRoute,
});

const personaBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/personas/builder',
  component: PersonaBuilderRoute,
});

const personaBuilderEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/personas/builder/$id',
  component: PersonaBuilderRoute,
});

// Locations
const locationLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/locations',
  component: LocationLibraryRoute,
});

const locationBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/locations/builder',
  component: LocationBuilderRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    mapId: typeof search['mapId'] === 'string' ? search['mapId'] : undefined,
    settingId: typeof search['settingId'] === 'string' ? search['settingId'] : undefined,
  }),
});

// Sessions
const sessionLibraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions',
  component: SessionLibraryRoute,
});

const sessionBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/builder',
  component: SessionBuilderRoute,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/$id/chat',
  component: ChatRoute,
});

// Docs
const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/docs',
  component: DocsRoute,
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
