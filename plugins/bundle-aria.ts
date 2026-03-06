import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { resolve } from 'node:path';
import * as zlib from 'node:zlib';
import { PluginOption } from 'vite';

const outDir = resolve(__dirname, '..', 'build');

/**
 * Matches <script> tags that have no src attribute.
 * Capture group 1: everything between <script and >
 * Capture group 2: inner content
 */
const INLINE_SCRIPT_RE =
  /<script(?![^>]*\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi;

/**
 * Types that identify a script tag as executable JavaScript.
 * Anything else (e.g. text/ng-template) is left untouched.
 */
const JS_TYPES = new Set([
  '',
  'text/javascript',
  'application/javascript',
  'module',
]);

function isJsScript(attrs: string): boolean {
  const match = attrs.match(/\btype\s*=\s*["']([^"']*)["']/i);
  return JS_TYPES.has(match ? match[1].toLowerCase() : '');
}

/**
 * Downloads a URL and returns the response body as a Buffer.
 * Native fetch (Node 18+) follows redirects automatically.
 */
async function downloadBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Resolves the AllInOne zip download URL from the latest AriaNg GitHub release.
 */
async function fetchAriaNgBundleUrl(): Promise<string> {
  const response = await fetch(
    'https://api.github.com/repos/mayswind/AriaNg/releases/latest',
    { headers: { Accept: 'application/vnd.github+json' } },
  );
  if (!response.ok) {
    throw new Error(`GitHub API error: HTTP ${response.status}`);
  }
  const release = (await response.json()) as {
    assets: Array<{ name: string; browser_download_url: string }>;
  };
  const asset = release.assets.find(a => a.name.endsWith('-AllInOne.zip'));
  if (!asset) {
    throw new Error('AriaNg AllInOne zip not found in latest release assets');
  }
  return asset.browser_download_url;
}

/**
 * Extracts a single file by name from a ZIP buffer (in memory, no temp files).
 * Supports stored (method 0) and deflated (method 8) entries.
 *
 * ZIP local file header layout:
 *   0  4  signature  PK\x03\x04
 *   8  2  compression method  (0=stored, 8=deflate)
 *  18  4  compressed size
 *  26  2  file name length
 *  28  2  extra field length
 *  30  n  file name
 *  30+n+m file data
 */
function extractFromZip(buf: Buffer, target: string): Buffer {
  const SIG = 0x04034b50;
  let offset = 0;

  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== SIG) {
      // Not a local file header — reached central directory or end
      break;
    }

    const method = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf
      .subarray(offset + 30, offset + 30 + nameLen)
      .toString('utf-8');
    const dataStart = offset + 30 + nameLen + extraLen;

    if (name === target) {
      const compressed = buf.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return compressed;
      if (method === 8) return zlib.inflateRawSync(compressed);
      throw new Error(
        `Unsupported ZIP compression method ${method} for ${target}`,
      );
    }

    offset = dataStart + compressedSize;
  }

  throw new Error(`${target} not found in ZIP`);
}

async function fetchAriaNgHtml(): Promise<string> {
  const url = await fetchAriaNgBundleUrl();
  console.info(`AriaNg: downloading ${url}...`);
  const zipBuf = await downloadBuffer(url);
  return extractFromZip(zipBuf, 'index.html').toString('utf-8');
}

function extractInlineScripts(html: string): {
  modifiedHtml: string;
  chunks: Array<{ filename: string; content: string }>;
} {
  const chunks: Array<{ filename: string; content: string }> = [];

  const modifiedHtml = html.replace(
    INLINE_SCRIPT_RE,
    (_, attrs: string, content: string) => {
      if (!content.trim() || !isJsScript(attrs)) {
        return `<script${attrs}>${content}</script>`;
      }

      const hash = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex')
        .slice(0, 12);
      const filename = `aria-${hash}.js`;
      chunks.push({ filename, content });
      return `<script${attrs} src="chunks/${filename}"></script>`;
    },
  );

  return { modifiedHtml, chunks };
}

export default function bundleAria(): PluginOption {
  return {
    name: 'bundle-aria',
    writeBundle: {
      order: 'post',
      async handler() {
        if (!fs.existsSync(outDir)) {
          throw new Error('Build directory does not exist.');
        }

        const outputDir = resolve(outDir, 'manager');
        const chunksDir = resolve(outputDir, 'chunks');
        await fs.promises.mkdir(chunksDir, { recursive: true });

        const html = await fetchAriaNgHtml();
        const { modifiedHtml, chunks } = extractInlineScripts(html);

        await Promise.all([
          ...chunks.map(({ filename, content }) =>
            fs.promises.writeFile(
              resolve(chunksDir, filename),
              content,
              'utf-8',
            ),
          ),
          fs.promises.writeFile(
            resolve(outputDir, 'index.html'),
            modifiedHtml,
            'utf-8',
          ),
        ]);

        console.info(
          `AriaNg: extracted ${chunks.length} inline script(s) → build/manager/chunks/`,
        );
      },
    },
  };
}
