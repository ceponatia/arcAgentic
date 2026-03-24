import '@testing-library/jest-dom/vitest';
import { beforeAll, vi } from 'vitest';

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });

  if (!globalThis.requestAnimationFrame) {
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
    });
  }

  if (!globalThis.cancelAnimationFrame) {
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: (handle: number) => clearTimeout(handle),
    });
  }
});
