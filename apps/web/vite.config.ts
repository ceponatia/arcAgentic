import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(__dirname, '../../packages');

const FRAMEWORK_CHUNK_PATTERNS = ['/react/', '/react-dom/', '/zustand/', '/@preact/signals-react/'];
const FLOW_CHUNK_PATTERNS = ['/@xyflow/'];
const MARKDOWN_CHUNK_PATTERNS = [
  '/@mdx-js/',
  '/react-markdown/',
  '/rehype-',
  '/remark-',
  '/unified/',
  '/micromark/',
  '/mdast-',
  '/hast-',
  '/unist-',
  '/vfile/',
  '/lowlight/',
  '/highlight.js/',
];

function matchesChunkPattern(id: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => id.includes(pattern));
}

export default defineConfig(() => {
  const apiTarget = process.env['VITE_API_BASE_URL'] ?? 'http://localhost:3001';
  return {
    // In this monorepo, env vars live in the repo root `.env`.
    // This makes Vite load `.env`, `.env.local`, etc. from the repo root.
    envDir: path.resolve(__dirname, '../..'),
    // For GitHub Pages project sites, assets must be served from /<repo>/.
    // Set BASE_PATH in CI (or locally) to override.
    base:
      process.env['BASE_PATH'] ??
      (process.env['GITHUB_ACTIONS'] && process.env['GITHUB_REPOSITORY']
        ? `/${process.env['GITHUB_REPOSITORY'].split('/')[1] ?? ''}/`
        : '/'),
    plugins: [
      mdx({
        remarkPlugins: [remarkGfm, remarkFrontmatter],
        // Note: we keep rehypeSlug so headings get stable IDs, but
        // we intentionally disable rehype-autolink-headings. With
        // hash-based routing (`#/docs/...`), auto-linked headings
        // change the hash to just `#id`, which navigates away from
        // the docs route and back to the app landing page.
        // If you want a heading to be a link, add it manually in MDX.
        rehypePlugins: [rehypeHighlight, rehypeSlug],
      }),
    ],
    resolve: {
      alias: {
        '@arcagentic/schemas': path.resolve(packagesDir, 'schemas/src'),
        '@arcagentic/ui': path.resolve(packagesDir, 'ui/src'),
        '@arcagentic/utils': path.resolve(packagesDir, 'utils/src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/characters': {
          target: apiTarget,
          changeOrigin: true,
          bypass(req) {
            if (req.headers.accept?.includes('text/html')) {
              return '/index.html';
            }
          },
        },
        '/settings': {
          target: apiTarget,
          changeOrigin: true,
          bypass(req) {
            if (req.headers.accept?.includes('text/html')) {
              return '/index.html';
            }
          },
        },
        '/sessions': {
          target: apiTarget,
          changeOrigin: true,
          bypass(req) {
            if (req.headers.accept?.includes('text/html')) {
              return '/index.html';
            }
          },
        },
      },
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // @xyflow/react ships ESM with a "use client" directive (Next.js hint).
          // Rollup warns during bundling even though it's harmless for our build.
          if (
            warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
            typeof warning.message === 'string' &&
            warning.message.includes('"use client"')
          ) {
            return;
          }

          warn(warning);
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (matchesChunkPattern(id, FRAMEWORK_CHUNK_PATTERNS)) return 'vendor-framework';
            if (matchesChunkPattern(id, FLOW_CHUNK_PATTERNS)) return 'vendor-xyflow';
            if (matchesChunkPattern(id, MARKDOWN_CHUNK_PATTERNS)) return 'vendor-markdown';
          },
        },
      },
    },
  };
});
