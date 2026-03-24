import {
  CreateNpcInstanceRequestSchema,
  CreateSessionRequestSchema,
  MessageRequestSchema,
} from '@arcagentic/schemas';

describe('Session request boundary schemas', () => {
  it('accepts valid message request content from 1 to 4000 characters', () => {
    expect(
      MessageRequestSchema.safeParse({
        content: 'Hello there',
      }).success
    ).toBe(true);

    expect(
      MessageRequestSchema.safeParse({
        content: 'a'.repeat(4000),
      }).success
    ).toBe(true);
  });

  it('rejects empty message content', () => {
    expect(
      MessageRequestSchema.safeParse({
        content: '',
      }).success
    ).toBe(false);
  });

  it('rejects message content longer than 4000 characters', () => {
    expect(
      MessageRequestSchema.safeParse({
        content: 'a'.repeat(4001),
      }).success
    ).toBe(false);
  });

  it('requires characterId and settingId for session creation', () => {
    expect(
      CreateSessionRequestSchema.safeParse({
        characterId: 'char-001',
        settingId: 'setting-001',
      }).success
    ).toBe(true);
  });

  it('rejects session creation requests with missing required fields', () => {
    expect(
      CreateSessionRequestSchema.safeParse({
        settingId: 'setting-001',
      }).success
    ).toBe(false);

    expect(
      CreateSessionRequestSchema.safeParse({
        characterId: 'char-001',
      }).success
    ).toBe(false);
  });

  it('requires templateId for NPC instance creation', () => {
    expect(
      CreateNpcInstanceRequestSchema.safeParse({
        templateId: 'template-001',
      }).success
    ).toBe(true);

    expect(CreateNpcInstanceRequestSchema.safeParse({}).success).toBe(false);
  });
});
