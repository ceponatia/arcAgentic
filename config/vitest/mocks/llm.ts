import { vi } from 'vitest';

export interface MockLlmProvider {
  id: string;
  supportsTools: boolean;
  supportsFunctions: boolean;
  chat: ReturnType<typeof vi.fn>;
  stream: ReturnType<typeof vi.fn>;
}

export function mockLlmProvider(
  overrides: Partial<MockLlmProvider> = {}
): MockLlmProvider {
  return {
    id: 'mock-llm',
    supportsTools: true,
    supportsFunctions: true,
    chat: vi.fn(),
    stream: vi.fn(),
    ...overrides,
  };
}
