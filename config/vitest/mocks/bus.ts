import { vi } from 'vitest';

export interface MockWorldBus {
  emit: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  use: ReturnType<typeof vi.fn>;
}

export function mockBus(): MockWorldBus {
  return {
    emit: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn(),
    use: vi.fn(),
  };
}
