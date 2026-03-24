import { isUrlDomain, redactUrlForLogging, sanitizeUrl } from '../src/url-sanitizer.js';

describe('sanitizeUrl', () => {
  it('returns clean URLs for supported protocols', () => {
    const urls = [
      'http://example.com/path',
      'https://example.com/path?value=1',
      'postgresql://localhost:5432/app',
      'postgres://localhost:5432/app',
    ];

    for (const url of urls) {
      expect(sanitizeUrl(url)).toBe(new URL(url).toString());
    }
  });

  it('redacts credentials from supported URLs', () => {
    expect(sanitizeUrl('https://user:pass@example.com/path')).toBe(
      'https://user:***@example.com/path'
    );
    expect(sanitizeUrl('postgresql://user:pass@localhost:5432/app')).toBe(
      'postgresql://user:***@localhost:5432/app'
    );
  });

  it('returns a best-effort fallback for malformed URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('not a url');
    expect(sanitizeUrl('https://user:pass@bad host')).toBe('https://user:***@bad host');
  });

  it('throws on unsupported protocols', () => {
    expect(() => sanitizeUrl('ftp://example.com/file.txt')).toThrow('Invalid protocol: ftp:');
  });
});

describe('isUrlDomain', () => {
  it('returns true for an exact domain match', () => {
    expect(isUrlDomain('https://example.com/resource', 'example.com')).toBe(true);
  });

  it('returns true for a subdomain match', () => {
    expect(isUrlDomain('https://api.example.com/resource', 'example.com')).toBe(true);
  });

  it('returns false for a non-matching domain', () => {
    expect(isUrlDomain('https://example.net/resource', 'example.com')).toBe(false);
  });
});

describe('redactUrlForLogging', () => {
  it('returns the sanitized URL for valid URLs', () => {
    expect(redactUrlForLogging('https://user:pass@example.com/path')).toBe(
      'https://user:***@example.com/path'
    );
  });

  it('returns a fallback redaction for URLs that sanitizeUrl rejects', () => {
    expect(redactUrlForLogging('ftp://user:pass@example.com/file.txt')).toBe(
      'ftp://user:***@example.com/file.txt'
    );
  });
});
