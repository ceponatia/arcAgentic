# Base tsconfig usage

All packages should extend the root config at `../../tsconfig.base.json`.
Do not set `include`/`exclude` in the base; each package should specify its own.

## Example: Node API package

`packages/api/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "moduleResolution": "NodeNext",
    "types": ["node"]
  },
  "include": ["src"]
}
```

## Example: Vite React app

`packages/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Notes

- Base uses strict ESM (`module: ESNext`, `verbatimModuleSyntax: true`).
- Base sets `moduleResolution: Bundler` for best DX with modern bundlers.
- Server packages can override to `NodeNext` for Node 20+ resolution behavior.
- Add package-specific types as needed (e.g., `node`, `vitest`, `vite/client`).
