import { getFilename, verifyFileName } from '@/utils';
import { describe, expect, test } from '@jest/globals';
import { Runtime } from 'webextension-polyfill';

import PlatformOs = Runtime.PlatformOs;

describe('getFilename', () => {
  describe('Empty fullPath - URL fallback scenarios', () => {
    test('should extract filename from valid URL', () => {
      expect(getFilename('', 'https://example.com/file.pdf')).toBe('file.pdf');
      expect(getFilename('', 'http://site.org/docs/report.docx')).toBe(
        'report.docx',
      );
      expect(getFilename('', 'https://api.example.com/v1/data.json')).toBe(
        'data.json',
      );
    });

    test('should handle URLs with query parameters', () => {
      expect(
        getFilename('', 'https://example.com/file.pdf?download=true'),
      ).toBe('file.pdf');
      expect(getFilename('', 'https://site.com/image.jpg?v=1&size=large')).toBe(
        'image.jpg',
      );
    });

    test('should handle URLs with fragments', () => {
      expect(
        getFilename('', 'https://example.com/document.html#section1'),
      ).toBe('document.html');
    });

    test('should handle URLs with encoded characters', () => {
      expect(getFilename('', 'https://example.com/my%20file.pdf')).toBe(
        'my%20file.pdf',
      );
      expect(getFilename('', 'https://example.com/file%20(1).txt')).toBe(
        'file%20(1).txt',
      );
    });

    test('should handle URLs ending with slash', () => {
      expect(getFilename('', 'https://example.com/folder/')).toBe('UNKNOWN');
      expect(getFilename('', 'https://example.com/')).toBe('UNKNOWN');
    });

    test('should handle URLs with no filename', () => {
      expect(getFilename('', 'https://example.com')).toBe('UNKNOWN');
      expect(getFilename('', 'https://example.com/')).toBe('UNKNOWN');
    });

    test('should handle invalid URLs', () => {
      expect(getFilename('', 'not-a-valid-url')).toBe('UNKNOWN');
      expect(getFilename('', '')).toBe('UNKNOWN');
      expect(getFilename('', 'ftp://invalid')).toBe('UNKNOWN');
    });

    test('should handle whitespace-only fullPath', () => {
      expect(getFilename('   ', 'https://example.com/file.txt')).toBe(
        'file.txt',
      );
      expect(getFilename('\t\n', 'https://example.com/document.pdf')).toBe(
        'document.pdf',
      );
    });

    test('should handle URLs with multiple consecutive slashes', () => {
      expect(getFilename('', 'https://example.com//file.txt')).toBe('file.txt');
      expect(
        getFilename('', 'https://example.com/folder//subfolder/file.pdf'),
      ).toBe('file.pdf');
    });

    test('should handle URLs with port numbers', () => {
      expect(getFilename('', 'https://example.com:8080/file.txt')).toBe(
        'file.txt',
      );
      expect(getFilename('', 'http://localhost:3000/app.js')).toBe('app.js');
    });
  });

  describe('Unix-style paths', () => {
    test('should extract filename from absolute Unix paths', () => {
      expect(getFilename('/home/user/document.txt', '')).toBe('document.txt');
      expect(getFilename('/var/log/system.log', '')).toBe('system.log');
      expect(getFilename('/tmp/temp_file.tmp', '')).toBe('temp_file.tmp');
    });

    test('should extract filename from relative Unix paths', () => {
      expect(getFilename('folder/file.txt', '')).toBe('file.txt');
      expect(getFilename('./local/file.pdf', '')).toBe('file.pdf');
      expect(getFilename('../parent/file.doc', '')).toBe('file.doc');
    });

    test('should handle Unix paths with no extension', () => {
      expect(getFilename('/usr/bin/node', '')).toBe('node');
      expect(getFilename('/home/user/README', '')).toBe('README');
    });

    test('should handle Unix paths with multiple dots', () => {
      expect(getFilename('/home/user/file.backup.txt', '')).toBe(
        'file.backup.txt',
      );
      expect(getFilename('/tmp/archive.tar.gz', '')).toBe('archive.tar.gz');
    });

    test('should handle Unix paths ending with slash', () => {
      expect(getFilename('/home/user/', '')).toBe('UNKNOWN');
      expect(getFilename('/var/log/', '')).toBe('UNKNOWN');
    });

    test('should handle Unix paths with spaces and special characters', () => {
      expect(getFilename('/home/user/my file.txt', '')).toBe('my file.txt');
      expect(getFilename('/tmp/file (1).pdf', '')).toBe('file (1).pdf');
      expect(getFilename('/home/user/file@domain.com.txt', '')).toBe(
        'file@domain.com.txt',
      );
    });

    test('should handle root path', () => {
      expect(getFilename('/', '')).toBe('UNKNOWN');
    });

    test('should handle single filename (no path)', () => {
      expect(getFilename('file.txt', '')).toBe('file.txt');
      expect(getFilename('document', '')).toBe('document');
    });
  });

  describe('Windows-style paths', () => {
    test('should extract filename from absolute Windows paths', () => {
      expect(getFilename('C:\\Users\\user\\document.txt', '')).toBe(
        'document.txt',
      );
      expect(getFilename('D:\\Projects\\app\\index.js', '')).toBe('index.js');
      expect(getFilename('E:\\backup\\data.sql', '')).toBe('data.sql');
    });

    test('should extract filename from relative Windows paths', () => {
      expect(getFilename('folder\\file.txt', '')).toBe('file.txt');
      expect(getFilename('.\\local\\file.pdf', '')).toBe('file.pdf');
      expect(getFilename('..\\parent\\file.doc', '')).toBe('file.doc');
    });

    test('should handle Windows paths with no extension', () => {
      expect(getFilename('C:\\Windows\\System32\\notepad', '')).toBe('notepad');
      expect(getFilename('D:\\Programs\\MyApp', '')).toBe('MyApp');
    });

    test('should handle Windows paths with multiple dots', () => {
      expect(getFilename('C:\\Users\\user\\file.backup.txt', '')).toBe(
        'file.backup.txt',
      );
      expect(getFilename('D:\\archive\\backup.tar.gz', '')).toBe(
        'backup.tar.gz',
      );
    });

    test('should handle Windows paths ending with backslash', () => {
      expect(getFilename('C:\\Users\\user\\', '')).toBe('UNKNOWN');
      expect(getFilename('D:\\Projects\\', '')).toBe('UNKNOWN');
    });

    test('should handle Windows paths with spaces and special characters', () => {
      expect(getFilename('C:\\Users\\user\\my file.txt', '')).toBe(
        'my file.txt',
      );
      expect(getFilename('D:\\Documents\\file (1).pdf', '')).toBe(
        'file (1).pdf',
      );
      expect(getFilename('C:\\temp\\file@domain.com.txt', '')).toBe(
        'file@domain.com.txt',
      );
    });

    test('should handle Windows UNC paths', () => {
      expect(getFilename('\\\\server\\share\\file.txt', '')).toBe('file.txt');
      expect(getFilename('\\\\network\\folder\\document.pdf', '')).toBe(
        'document.pdf',
      );
    });

    test('should handle Windows drive root', () => {
      expect(getFilename('C:\\', '')).toBe('UNKNOWN');
      expect(getFilename('D:\\', '')).toBe('UNKNOWN');
    });
  });

  describe('Mixed path separators', () => {
    test('should handle mixed forward and back slashes', () => {
      expect(getFilename('C:/Users/user\\document.txt', '')).toBe(
        'document.txt',
      );
      expect(getFilename('/home\\user/file.pdf', '')).toBe('file.pdf');
      expect(getFilename('folder/subfolder\\file.txt', '')).toBe('file.txt');
    });

    test('should handle consecutive mixed separators', () => {
      expect(getFilename('folder//subfolder\\\\file.txt', '')).toBe('file.txt');
      expect(getFilename('path\\\\//file.pdf', '')).toBe('file.pdf');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty strings', () => {
      expect(getFilename('', '')).toBe('UNKNOWN');
    });

    test('should handle paths with only separators', () => {
      expect(getFilename('/', '')).toBe('UNKNOWN');
      expect(getFilename('\\', '')).toBe('UNKNOWN');
      expect(getFilename('///', '')).toBe('UNKNOWN');
      expect(getFilename('\\\\\\', '')).toBe('UNKNOWN');
    });

    test('should handle very long filenames', () => {
      const longFilename = 'a'.repeat(255) + '.txt';
      expect(getFilename(`/path/to/${longFilename}`, '')).toBe(longFilename);
      expect(getFilename(`C:\\path\\to\\${longFilename}`, '')).toBe(
        longFilename,
      );
    });

    test('should handle filenames with only dots', () => {
      expect(getFilename('/home/user/.', '')).toBe('.');
      expect(getFilename('/home/user/..', '')).toBe('..');
      expect(getFilename('C:\\Users\\user\\.hidden', '')).toBe('.hidden');
    });

    test('should handle unicode characters', () => {
      expect(getFilename('/home/user/файл.txt', '')).toBe('файл.txt');
      expect(getFilename('C:\\Users\\user\\文件.pdf', '')).toBe('文件.pdf');
      expect(getFilename('/tmp/🚀rocket.txt', '')).toBe('🚀rocket.txt');
    });
  });

  describe('URL fallback with various scenarios', () => {
    test('should prioritize fullPath over URL when fullPath is not empty', () => {
      expect(
        getFilename('/home/user/local.txt', 'https://example.com/remote.pdf'),
      ).toBe('local.txt');
      expect(
        getFilename(
          'C:\\Users\\user\\local.doc',
          'https://example.com/remote.txt',
        ),
      ).toBe('local.doc');
    });

    test('should handle malformed URLs gracefully', () => {
      expect(getFilename('', 'https://')).toBe('UNKNOWN');
      expect(getFilename('', 'http://')).toBe('UNKNOWN');
      expect(getFilename('', 'https://example')).toBe('UNKNOWN');
    });

    test('should handle URLs with unusual protocols', () => {
      expect(getFilename('', 'file:///home/user/document.txt')).toBe(
        'document.txt',
      );
      expect(getFilename('', 'ftp://server.com/file.zip')).toBe('file.zip');
    });

    test('should handle data URLs', () => {
      expect(getFilename('', 'data:text/plain;base64,SGVsbG8=')).toBe(
        'plain;base64,SGVsbG8=',
      );
    });

    test('should handle blob URLs', () => {
      expect(
        getFilename(
          '',
          'blob:https://example.com/550e8400-e29b-41d4-a716-446655440000',
        ),
      ).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});

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
      // Test some control characters using \p{C}
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
      expect(verifyFileName('.', 'win')).toBe(false); // Ends with dot
      expect(verifyFileName('..', 'linux')).toBe(true);
      expect(verifyFileName('..', 'win')).toBe(false); // Ends with dot
    });

    test('should handle filenames with multiple extensions', () => {
      expect(verifyFileName('file.tar.gz', 'linux')).toBe(true);
      expect(verifyFileName('file.tar.gz', 'win')).toBe(true);
      expect(verifyFileName('backup.sql.bak', 'linux')).toBe(true);
      expect(verifyFileName('backup.sql.bak', 'win')).toBe(true);
    });
  });
});
