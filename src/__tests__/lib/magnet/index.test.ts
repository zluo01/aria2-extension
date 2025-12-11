import { augmentDownloadLink } from '@/lib/magnet';
import { describe, expect, test } from '@jest/globals';

describe('augmentDownloadLink', () => {
  describe('HTTP/HTTPS URLs', () => {
    test('should return http URLs unchanged', () => {
      const input = 'http://example.com/file.zip';
      expect(augmentDownloadLink(input)).toBe(input);
    });

    test('should return URLs ending with https unchanged', () => {
      const input = 'ftp://example.com/https';
      expect(augmentDownloadLink(input)).toBe(input);
    });

    test('should return https URLs unchanged', () => {
      const input = 'https://example.com/file.zip';
      expect(augmentDownloadLink(input)).toBe(input);
    });
  });

  describe('SHA-1 hashes (40 hex characters)', () => {
    test('should convert valid SHA-1 hash to magnet link with btih', () => {
      const sha1 = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d';
      const expected =
        'magnet:?xt=urn:btih:aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d';
      expect(augmentDownloadLink(sha1)).toBe(expected);
    });

    test('should handle SHA-1 hash with leading/trailing whitespace', () => {
      const sha1 = '  aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d  ';
      const expected =
        'magnet:?xt=urn:btih:aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d';
      expect(augmentDownloadLink(sha1)).toBe(expected);
    });

    test('should handle uppercase SHA-1 hash as invalid (returns as-is)', () => {
      const sha1 = 'AAF4C61DDCC5E8A2DABEDE0F3B482CD9AEA9434D';
      // Regex only matches lowercase, so this should return as-is
      expect(augmentDownloadLink(sha1)).toBe(sha1);
    });
  });

  describe('SHA-256 hashes (64 hex characters)', () => {
    test('should convert valid SHA-256 hash to magnet link with btmh', () => {
      const sha256 =
        '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
      const expected =
        'magnet:?xt=urn:btmh:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
      expect(augmentDownloadLink(sha256)).toBe(expected);
    });

    test('should handle SHA-256 hash with whitespace', () => {
      const sha256 =
        '\t2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae\n';
      const expected =
        'magnet:?xt=urn:btmh:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
      expect(augmentDownloadLink(sha256)).toBe(expected);
    });
  });

  describe('MD5 hashes (32 hex characters)', () => {
    test('should convert valid MD5 hash to magnet link with md5', () => {
      const md5 = '098f6bcd4621d373cade4e832627b4f6';
      const expected = 'magnet:?xt=urn:md5:098f6bcd4621d373cade4e832627b4f6';
      expect(augmentDownloadLink(md5)).toBe(expected);
    });

    test('should handle uppercase MD5 hash', () => {
      const md5 = '098F6BCD4621D373CADE4E832627B4F6';
      const expected = 'magnet:?xt=urn:md5:098F6BCD4621D373CADE4E832627B4F6';
      expect(augmentDownloadLink(md5)).toBe(expected);
    });

    test('should handle mixed case MD5 hash', () => {
      const md5 = '098f6BCD4621d373CADE4e832627b4F6';
      const expected = 'magnet:?xt=urn:md5:098f6BCD4621d373CADE4e832627b4F6';
      expect(augmentDownloadLink(md5)).toBe(expected);
    });

    test('should handle MD5 hash with whitespace', () => {
      const md5 = '  098f6bcd4621d373cade4e832627b4f6  ';
      const expected = 'magnet:?xt=urn:md5:098f6bcd4621d373cade4e832627b4f6';
      expect(augmentDownloadLink(md5)).toBe(expected);
    });
  });

  describe('Invalid inputs', () => {
    test('should return invalid hash lengths unchanged', () => {
      const input = '12345'; // Too short
      expect(augmentDownloadLink(input)).toBe(input);
    });

    test('should return hash with non-hex characters unchanged', () => {
      const input = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'; // 32 chars but not hex
      expect(augmentDownloadLink(input)).toBe(input);
    });

    test('should return 41 character hex string unchanged', () => {
      const input = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d1'; // 41 chars
      expect(augmentDownloadLink(input)).toBe(input);
    });

    test('should return 63 character hex string unchanged', () => {
      const input =
        '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7a'; // 63 chars
      expect(augmentDownloadLink(input)).toBe(input);
    });

    test('should return empty string unchanged', () => {
      expect(augmentDownloadLink('')).toBe('');
    });

    test('should return whitespace-only string as empty after trim', () => {
      expect(augmentDownloadLink('   ')).toBe('');
    });

    test('should return magnet links unchanged', () => {
      const magnet =
        'magnet:?xt=urn:btih:aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d';
      expect(augmentDownloadLink(magnet)).toBe(magnet);
    });

    test('should return arbitrary text unchanged', () => {
      const text = 'just some random text';
      expect(augmentDownloadLink(text)).toBe(text);
    });
  });

  describe('Edge cases', () => {
    test('should handle hash with special characters unchanged', () => {
      const input = '098f6bcd-4621-d373-cade-4e832627b4f6'; // UUID format
      expect(augmentDownloadLink(input)).toBe(input);
    });

    test('should handle very long strings unchanged', () => {
      const input = 'a'.repeat(100);
      expect(augmentDownloadLink(input)).toBe(input);
    });
  });
});
