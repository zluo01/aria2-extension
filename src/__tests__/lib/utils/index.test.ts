import { downloadToQueryString, parseBytes, verifyFileName } from '@/lib/utils';
import { describe, expect, test } from '@jest/globals';
import { Runtime } from 'webextension-polyfill';

import PlatformOs = Runtime.PlatformOs;

describe('verifyFileName', () => {
  describe('Basic validation', () => {
    test('Known case.', () => {
      expect(verifyFileName('DARKONE TWEAK (32-Bit).7z', 'win')).toBe(true);
      expect(verifyFileName('DARKONE TWEAK (32-Bit).7z', 'linux')).toBe(true);
      expect(verifyFileName('DARKONE TWEAK (32-Bit).7z', 'mac')).toBe(true);
    });

    test('should return false for empty string', () => {
      expect(verifyFileName('', 'linux')).toBe(false);
      expect(verifyFileName('', 'win')).toBe(false);
    });

    test('should return false for null/undefined', () => {
      expect(verifyFileName(null as any, 'linux')).toBe(false);
      expect(verifyFileName(undefined as any, 'linux')).toBe(false);
    });

    test('should return false for strings with leading/trailing whitespace', () => {
      expect(verifyFileName(' filename.txt', 'linux')).toBe(false);
      expect(verifyFileName('filename.txt ', 'linux')).toBe(false);
      expect(verifyFileName('  filename.txt  ', 'linux')).toBe(false);
      expect(verifyFileName('\tfilename.txt', 'linux')).toBe(false);
      expect(verifyFileName('filename.txt\n', 'linux')).toBe(false);
    });

    test('should return true for valid simple filenames', () => {
      expect(verifyFileName('file.txt', 'linux')).toBe(true);
      expect(verifyFileName('document.pdf', 'linux')).toBe(true);
      expect(verifyFileName('image.jpg', 'linux')).toBe(true);
      expect(verifyFileName('script.js', 'linux')).toBe(true);
    });

    test('should allow spaces in middle of filename', () => {
      expect(verifyFileName('my file.txt', 'linux')).toBe(true);
      expect(verifyFileName('document with spaces.pdf', 'linux')).toBe(true);
      expect(verifyFileName('my file.txt', 'win')).toBe(true);
      expect(verifyFileName('document with spaces.pdf', 'win')).toBe(true);
    });
  });

  describe('Invalid character validation', () => {
    test('should return false for filenames with invalid characters', () => {
      const invalidChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

      invalidChars.forEach(char => {
        expect(verifyFileName(`file${char}name.txt`, 'linux')).toBe(false);
        expect(verifyFileName(`file${char}name.txt`, 'win')).toBe(false);
      });
    });

    test('should return false for filenames with control characters', () => {
      const controlChars = ['\x00', '\x01', '\x02', '\x1f', '\x7f'];

      controlChars.forEach(char => {
        expect(verifyFileName(`file${char}name.txt`, 'linux')).toBe(false);
        expect(verifyFileName(`file${char}name.txt`, 'win')).toBe(false);
      });
    });

    test('should return true for filenames with allowed special characters', () => {
      const allowedSpecialChars = [
        '-',
        '_',
        '.',
        '(',
        ')',
        '[',
        ']',
        '{',
        '}',
        '!',
        '@',
        '#',
        '$',
        '%',
        '^',
        '&',
        '+',
        '=',
        '~',
        '`',
      ];

      allowedSpecialChars.forEach(char => {
        expect(verifyFileName(`file${char}name.txt`, 'linux')).toBe(true);
        expect(verifyFileName(`file${char}name.txt`, 'win')).toBe(true);
      });
    });

    test('should handle unicode characters', () => {
      expect(verifyFileName('файл.txt', 'linux')).toBe(true);
      expect(verifyFileName('文件.pdf', 'linux')).toBe(true);
      expect(verifyFileName('🚀rocket.txt', 'linux')).toBe(true);

      expect(verifyFileName('файл.txt', 'win')).toBe(true);
      expect(verifyFileName('文件.pdf', 'win')).toBe(true);
      expect(verifyFileName('🚀rocket.txt', 'win')).toBe(true);
    });
  });

  describe('Unix-like system validation', () => {
    const unixLikeSystems: PlatformOs[] = [
      'mac',
      'linux',
      'android',
      'cros',
      'openbsd',
    ];

    test('should allow Unix-style filenames', () => {
      unixLikeSystems.forEach(os => {
        expect(verifyFileName('.hidden', os)).toBe(true);
        expect(verifyFileName('..', os)).toBe(true);
        expect(verifyFileName('.', os)).toBe(true);
        expect(verifyFileName('file.backup.txt', os)).toBe(true);
        expect(verifyFileName('my-file_v2.tar.gz', os)).toBe(true);
      });
    });

    test('should allow filenames ending with dots', () => {
      unixLikeSystems.forEach(os => {
        expect(verifyFileName('file.', os)).toBe(true);
        expect(verifyFileName('document.txt.', os)).toBe(true);
      });
    });

    test('should not apply Windows reserved name restrictions', () => {
      const windowsReservedNames = [
        'CON',
        'PRN',
        'AUX',
        'NUL',
        'COM1',
        'COM2',
        'LPT1',
        'LPT2',
      ];

      unixLikeSystems.forEach(os => {
        windowsReservedNames.forEach(name => {
          expect(verifyFileName(name, os)).toBe(true);
          expect(verifyFileName(name.toLowerCase(), os)).toBe(true);
          expect(verifyFileName(name + '.txt', os)).toBe(true);
        });
      });
    });
  });

  describe('Windows-specific validation', () => {
    test('should reject Windows reserved names', () => {
      const reservedNames = [
        'CON',
        'PRN',
        'AUX',
        'NUL',
        'COM1',
        'COM2',
        'COM3',
        'COM4',
        'COM5',
        'COM6',
        'COM7',
        'COM8',
        'COM9',
        'LPT1',
        'LPT2',
        'LPT3',
        'LPT4',
        'LPT5',
        'LPT6',
        'LPT7',
        'LPT8',
        'LPT9',
      ];

      reservedNames.forEach(name => {
        expect(verifyFileName(name, 'win')).toBe(false);
        expect(verifyFileName(name.toLowerCase(), 'win')).toBe(false);
        expect(verifyFileName(name + '.txt', 'win')).toBe(false);
        expect(verifyFileName(name.toLowerCase() + '.txt', 'win')).toBe(false);
      });
    });

    test('should allow similar but not reserved names on Windows', () => {
      expect(verifyFileName('CON1', 'win')).toBe(true);
      expect(verifyFileName('CONF', 'win')).toBe(true);
      expect(verifyFileName('PRNT', 'win')).toBe(true);
      expect(verifyFileName('COM10', 'win')).toBe(true);
      expect(verifyFileName('LPT10', 'win')).toBe(true);
      expect(verifyFileName('COM', 'win')).toBe(true);
      expect(verifyFileName('LPT', 'win')).toBe(true);
    });

    test('should reject filenames ending with dots on Windows', () => {
      expect(verifyFileName('file.', 'win')).toBe(false);
      expect(verifyFileName('document.txt.', 'win')).toBe(false);
      expect(verifyFileName('folder..', 'win')).toBe(false);
    });

    test('should allow dots in middle of filename on Windows', () => {
      expect(verifyFileName('file.backup.txt', 'win')).toBe(true);
      expect(verifyFileName('archive.tar.gz', 'win')).toBe(true);
    });

    test('should handle mixed case reserved names', () => {
      expect(verifyFileName('Con', 'win')).toBe(false);
      expect(verifyFileName('con', 'win')).toBe(false);
      expect(verifyFileName('CoN', 'win')).toBe(false);
      expect(verifyFileName('prn.TXT', 'win')).toBe(false);
      expect(verifyFileName('AUX.exe', 'win')).toBe(false);
    });
  });

  describe('Cross-platform validation', () => {
    test('should handle common valid filenames across all platforms', () => {
      const validFilenames = [
        'document.pdf',
        'image.jpg',
        'script.js',
        'README.md',
        'package.json',
        'my file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
      ];

      const allPlatforms: PlatformOs[] = [
        'mac',
        'win',
        'android',
        'cros',
        'linux',
        'openbsd',
      ];

      validFilenames.forEach(filename => {
        allPlatforms.forEach(platform => {
          expect(verifyFileName(filename, platform)).toBe(true);
        });
      });
    });

    test('should reject invalid characters across all platforms', () => {
      const invalidFilenames = [
        'file<name.txt',
        'file>name.txt',
        'file:name.txt',
        'file"name.txt',
        'file|name.txt',
        'file?name.txt',
        'file*name.txt',
        'file\\name.txt',
        'file/name.txt',
      ];

      const allPlatforms: PlatformOs[] = [
        'mac',
        'win',
        'android',
        'cros',
        'linux',
        'openbsd',
      ];

      invalidFilenames.forEach(filename => {
        allPlatforms.forEach(platform => {
          expect(verifyFileName(filename, platform)).toBe(false);
        });
      });
    });

    test('should validate platform differences for edge cases', () => {
      const testCases = [
        { filename: 'CON', winValid: false, otherValid: true },
        { filename: 'PRN.txt', winValid: false, otherValid: true },
        { filename: 'AUX.log', winValid: false, otherValid: true },
        { filename: 'NUL', winValid: false, otherValid: true },
        { filename: 'COM1.dat', winValid: false, otherValid: true },
        { filename: 'LPT9.cfg', winValid: false, otherValid: true },
        { filename: 'file.', winValid: false, otherValid: true },
        { filename: 'document.txt.', winValid: false, otherValid: true },
      ];

      const nonWindowsPlatforms: Array<Exclude<PlatformOs, 'win'>> = [
        'mac',
        'android',
        'cros',
        'linux',
        'openbsd',
      ];

      testCases.forEach(({ filename, winValid, otherValid }) => {
        expect(verifyFileName(filename, 'win')).toBe(winValid);
        nonWindowsPlatforms.forEach(platform => {
          expect(verifyFileName(filename, platform)).toBe(otherValid);
        });
      });
    });
  });

  describe('Edge cases', () => {
    test('should handle very long filenames', () => {
      const longFilename = 'a'.repeat(255);
      expect(verifyFileName(longFilename, 'linux')).toBe(true);
      expect(verifyFileName(longFilename, 'win')).toBe(true);
    });

    test('should handle single character filenames', () => {
      expect(verifyFileName('a', 'linux')).toBe(true);
      expect(verifyFileName('a', 'win')).toBe(true);
      expect(verifyFileName('1', 'linux')).toBe(true);
      expect(verifyFileName('1', 'win')).toBe(true);
    });

    test('should handle filenames with only dots', () => {
      expect(verifyFileName('.', 'linux')).toBe(true);
      expect(verifyFileName('.', 'win')).toBe(false);
      expect(verifyFileName('..', 'linux')).toBe(true);
      expect(verifyFileName('..', 'win')).toBe(false);
    });

    test('should handle filenames with multiple extensions', () => {
      expect(verifyFileName('file.tar.gz', 'linux')).toBe(true);
      expect(verifyFileName('file.tar.gz', 'win')).toBe(true);
      expect(verifyFileName('backup.sql.bak', 'linux')).toBe(true);
      expect(verifyFileName('backup.sql.bak', 'win')).toBe(true);
    });
  });
});

describe('parseBytes', () => {
  test('formats zero as bytes', () => {
    expect(parseBytes(0)).toBe('0.00 B');
  });

  test('formats values below 1000 as bytes', () => {
    expect(parseBytes(1)).toBe('1.00 B');
    expect(parseBytes(999)).toBe('999.00 B');
  });

  test('promotes to KB at exactly 1000', () => {
    expect(parseBytes(1000)).toBe('1.00 KB');
  });

  test('formats KB range', () => {
    expect(parseBytes(1500)).toBe('1.50 KB');
    expect(parseBytes(999999)).toBe('1000.00 KB');
  });

  test('promotes to MB at 1_000_000', () => {
    expect(parseBytes(1_000_000)).toBe('1.00 MB');
  });

  test('promotes to GB at 1_000_000_000', () => {
    expect(parseBytes(1_000_000_000)).toBe('1.00 GB');
  });

  test('promotes to TB at 1e12', () => {
    expect(parseBytes(1e12)).toBe('1.00 TB');
  });

  test('stops at YB (highest unit)', () => {
    // 1 YB = 1e24, value stays >= 1000 but order is capped
    expect(parseBytes(1e27)).toBe('1000.00 YB');
  });

  test('always returns two decimal places', () => {
    expect(parseBytes(1024)).toBe('1.02 KB');
    expect(parseBytes(1100)).toBe('1.10 KB');
  });
});

describe('downloadToQueryString', () => {
  test('serialises all IFileDetail fields to query string', () => {
    const detail = {
      url: 'https://example.com/file.zip',
      filename: 'file.zip',
      fileSize: 1024,
      incognito: false,
    };
    const qs = downloadToQueryString(detail);
    const params = new URLSearchParams(qs);
    expect(params.get('url')).toBe('https://example.com/file.zip');
    expect(params.get('filename')).toBe('file.zip');
    expect(params.get('fileSize')).toBe('1024');
    expect(params.get('incognito')).toBe('false');
  });

  test('converts incognito=true to string "true"', () => {
    const detail = {
      url: 'https://example.com/f',
      filename: 'f',
      fileSize: 0,
      incognito: true,
    };
    const params = new URLSearchParams(downloadToQueryString(detail));
    expect(params.get('incognito')).toBe('true');
  });

  test('filters out undefined values', () => {
    const detail = {
      url: 'https://example.com/f',
      filename: 'f',
      fileSize: undefined as any,
      incognito: false,
    };
    const params = new URLSearchParams(downloadToQueryString(detail));
    expect(params.has('fileSize')).toBe(false);
  });

  test('URL-encodes special characters in filename', () => {
    const detail = {
      url: 'https://example.com/f',
      filename: 'my file & more.zip',
      fileSize: 0,
      incognito: false,
    };
    const params = new URLSearchParams(downloadToQueryString(detail));
    expect(params.get('filename')).toBe('my file & more.zip');
  });

  test('handles fileSize of zero', () => {
    const detail = {
      url: 'https://x.com/f',
      filename: 'f',
      fileSize: 0,
      incognito: false,
    };
    const params = new URLSearchParams(downloadToQueryString(detail));
    expect(params.get('fileSize')).toBe('0');
  });
});
