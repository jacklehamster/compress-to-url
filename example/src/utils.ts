import { compressToUrl, decompressFromUrl } from 'compress-to-url';

export const SCRAPER_URL = ''; // Blank in example, extracted from HTML in production

export function getScraperUrl(): string {
  return (window as any).SCRAPER_URL || SCRAPER_URL;
}

export function debounce(func: (...args: any[]) => void, wait: number) {
  let timeout: number | undefined;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait) as any;
  };
}

export function socialMetadataTemplate() {
  return `
<meta charset="UTF-8">
<meta property="og:title" content="[Your Title]">
<meta property="og:description" content="[Your Description]">
<meta property="og:image" content="[Your Image URL]">
<meta property="og:url" content="[Your URL]">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="[Your Title]">
<meta name="twitter:description" content="[Your Description]">
<meta name="twitter:image" content="[Your Image URL]">
`.trim();
}

export function jsonLdTemplate() {
  return `
<script type="application/ld+json">
  {
    "@context": "http://schema.org",
    "@type": "WebPage",
    "name": "[Your Title]",
    "description": "[Your Description]",
    "image": "[Your Image URL]",
    "url": "[Your URL]"
  }
</script>
`.trim();
}

export async function compressCode(code: string, cache: Map<string, string>) {
  if (cache.has(code)) return cache.get(code)!;
  const result = await compressToUrl(code, {
    inputType: 'string',
    mimeType: 'text/html',
    normalizeWhitespace: false,
  });
  cache.set(code, result.payload);
  return result.payload;
}

export async function decompressCode(payload: string) {
  const { data } = await decompressFromUrl(payload);
  return data as string;
}

export async function scrapeMetadata(url: string) {
  const scraperUrl = getScraperUrl();
  if (!scraperUrl) return null;
  try {
    const response = await fetch(`${scraperUrl}?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Scrape failed');
    return await response.json();
  } catch {
    return null;
  }
}

export function parseMetaFields(html: string) {
  const fields = { title: '', description: '', image_url: '', url: '' };
  const patterns = [
    { key: 'title', regex: [/<title>(.*?)<\/title>/i, /<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i, /<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"/i] },
    { key: 'description', regex: [/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i, /<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"/i, /<meta[^>]*name="description"[^>]*content="([^"]*)"/i, /"description":\s*"([^"]*)"/i] },
    { key: 'image_url', regex: [/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i, /<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"/i, /"image":\s*"([^"]*)"/i] },
    { key: 'url', regex: [/<meta[^>]*property="og:url"[^>]*content="([^"]*)"/i, /"url":\s*"([^"]*)"/i] },
  ];

  for (const { key, regex } of patterns) {
    for (const r of regex) {
      const match = html.match(r);
      if (match) {
        fields[key as keyof typeof fields] = match[1];
        break;
      }
    }
  }
  return fields;
}

export function updateActiveFields(html: string) {
  return {
    description: html.includes('og:description') || html.includes('twitter:description') || html.includes('description":'),
    image_url: html.includes('og:image') || html.includes('twitter:image') || html.includes('image":'),
    url: html.includes('og:url') || html.includes('url":'),
  };
}
