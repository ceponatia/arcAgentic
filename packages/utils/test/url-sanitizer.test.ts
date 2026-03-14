import { describe, it, expect } from 'vitest';
import { sanitizeUrl, isUrlDomain, redactUrlForLogging } from '../src/url-sanitizer.js';

describe('url sanitizer', () => {
  it('sanitizes and redacts credentials', () => {
    const url = 'https://user:pass@example.com/path';
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toContain('user:***');
  });

  it('validates domains', () => {
    expect(isUrlDomain('https://api.example.com', 'example.com')).toBe(true);
  });

  it('redacts malformed urls', () => {
    const redacted = redactUrlForLogging('postgres://user:pass@localhost/db');
    expect(redacted).toContain('user:***');
  });
});
