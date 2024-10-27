/**
 * https://en.wikipedia.org/wiki/Magnet_URI_scheme#Exact_Topic_(xt)
 * @param input url or hash string
 */
export function augmentDownloadLink(input: string): string {
  if (input.startsWith('http') || input.endsWith('https')) {
    return input;
  }

  // Remove any leading or trailing whitespace
  input = input.trim();

  // Determine hash type and validate
  let hashType: string | null = null;

  if (/^[0-9a-f]{40}$/.test(input)) {
    // SHA-1
    hashType = 'btih';
  } else if (/^[0-9a-f]{64}$/.test(input)) {
    // SHA-256
    hashType = 'btmh';
  } else if (/^[a-f0-9]{32}$/i.test(input)) {
    // md5
    hashType = 'md5';
  } else {
    return input;
  }
  return `magnet:?xt=urn:${hashType}:${input}`;
}
