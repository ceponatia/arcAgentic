import { useNavigate, useRouterState } from '@tanstack/react-router';
import type { ViewMode } from '../types.js';

export interface NavController {
  viewMode: ViewMode;
  navigateToHome: () => void;
  navigateToCharacterLibrary: () => void;
  navigateToCharacterStudio: (id: string | null) => void;
  navigateToSettingLibrary: () => void;
  navigateToSettingBuilder: (id: string | null) => void;
  navigateToTagLibrary: () => void;
  navigateToTagBuilder: (id?: string | null) => void;
  navigateToItemLibrary: () => void;
  navigateToItemBuilder: (id?: string | null) => void;
  navigateToPersonaLibrary: () => void;
  navigateToPersonaBuilder: (id?: string | null) => void;
  navigateToLocationLibrary: () => void;
  navigateToLocationBuilder: (params?: { mapId?: string; settingId?: string } | null) => void;
  navigateToSessionLibrary: () => void;
  navigateToSessionBuilder: () => void;
  navigateToDocs: () => void;
  selectSession: (id: string) => void;
}

function pathToViewMode(pathname: string): ViewMode {
  if (pathname === '/') return 'home';
  if (pathname === '/characters') return 'character-library';
  if (pathname.startsWith('/characters/studio')) return 'character-studio';
  if (pathname === '/settings') return 'setting-library';
  if (pathname.startsWith('/settings/builder')) return 'setting-builder';
  if (pathname === '/tags') return 'tag-library';
  if (pathname.startsWith('/tags/builder')) return 'tag-builder';
  if (pathname === '/items') return 'item-library';
  if (pathname.startsWith('/items/builder')) return 'item-builder';
  if (pathname === '/personas') return 'persona-library';
  if (pathname.startsWith('/personas/builder')) return 'persona-builder';
  if (pathname === '/locations') return 'location-library';
  if (pathname.startsWith('/locations/builder')) return 'location-builder';
  if (pathname === '/sessions') return 'session-library';
  if (pathname === '/sessions/builder') return 'session-builder';
  if (/^\/sessions\/[^/]+\/chat$/.exec(pathname)) return 'chat';
  if (pathname === '/docs') return 'docs';
  return 'home';
}

export function useLegacyNavAdapter(): NavController {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const viewMode = pathToViewMode(pathname);

  return {
    viewMode,
    navigateToHome: () => void navigate({ to: '/' }),
    navigateToCharacterLibrary: () => void navigate({ to: '/characters' }),
    navigateToCharacterStudio: (id: string | null) => {
      if (id) void navigate({ to: '/characters/studio/$id', params: { id } });
      else void navigate({ to: '/characters/studio' });
    },
    navigateToSettingLibrary: () => void navigate({ to: '/settings' }),
    navigateToSettingBuilder: (id: string | null) => {
      if (id) void navigate({ to: '/settings/builder/$id', params: { id } });
      else void navigate({ to: '/settings/builder' });
    },
    navigateToTagLibrary: () => void navigate({ to: '/tags' }),
    navigateToTagBuilder: (id?: string | null) => {
      if (id) void navigate({ to: '/tags/builder/$id', params: { id } });
      else void navigate({ to: '/tags/builder' });
    },
    navigateToItemLibrary: () => void navigate({ to: '/items' }),
    navigateToItemBuilder: (id?: string | null) => {
      if (id) void navigate({ to: '/items/builder/$id', params: { id } });
      else void navigate({ to: '/items/builder' });
    },
    navigateToPersonaLibrary: () => void navigate({ to: '/personas' }),
    navigateToPersonaBuilder: (id?: string | null) => {
      if (id) void navigate({ to: '/personas/builder/$id', params: { id } });
      else void navigate({ to: '/personas/builder' });
    },
    navigateToLocationLibrary: () => void navigate({ to: '/locations' }),
    navigateToLocationBuilder: (params?: { mapId?: string; settingId?: string } | null) => {
      void navigate({
        to: '/locations/builder',
        search: { mapId: params?.mapId, settingId: params?.settingId },
      });
    },
    navigateToSessionLibrary: () => void navigate({ to: '/sessions' }),
    navigateToSessionBuilder: () => void navigate({ to: '/sessions/builder' }),
    navigateToDocs: () => void navigate({ to: '/docs' }),
    selectSession: (id: string) => void navigate({ to: '/sessions/$id/chat', params: { id } }),
  };
}
