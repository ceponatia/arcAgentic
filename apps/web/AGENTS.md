# @arcagentic/web

## Purpose

Vite-based React frontend for ArcAgentic. The player-facing web client that communicates with the API backend.

## Scope

- Web frontend pages, route modules, and feature components
- TanStack Router route definitions under `src/routes/` and the generated code-based route tree
- Client-side state management with Zustand stores, including shared session/runtime stores and feature-specific stores
- Route-level data loading and mutations through domain-specific API client modules under `src/shared/api/`
- Frontend shell composition through `RootLayout` and its navigation components
- Frontend configuration, assets, and Vite 7 build tooling

## Package Connections

- **ui**: Imports shared React components
- **schemas**: Uses types for API request/response shapes
- **generator**: Calls generator for character creation
- **utils**: Shared utility functions
- **db**: Indirect dependency through API (web does not call db directly)

## Code Standards

- TypeScript with strict typing
- React with functional components and hooks
- Keep types in domain-level and shared types files where appropriate. Do not define types in-line.
- Use utils from `@arcagentic/utils` instead of duplicating logic.
- Prefer to add utils to `@arcagentic/utils` instead of scope-specific helpers when possible.

## Architecture Notes

- Routing uses TanStack Router (`@tanstack/react-router`) with route modules under `src/routes/` and a generated route tree.
- The app shell is `RootLayout`, which composes shared navigation pieces such as `Sidebar`, `ShellHeader`, `NavItems`, and `MobileDrawer`.
- Data fetching is owned by route modules and feature code instead of a long-lived app controller.
- Shared client state lives in Zustand stores such as the session store, runtime store, and feature-local stores.
- Backend communication is organized through domain-specific API client modules in `src/shared/api/`.

This package is the frontend entry point. All backend communication goes through the API package.
