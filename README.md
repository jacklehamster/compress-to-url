# compress-to-url

[![npm version](https://badge.fury.io/js/compress-to-url.svg)](https://www.npmjs.com/package/compress-to-url)

**Compress a webpage into a shareable URL.** This library enables you to encode HTML content, including social media metadata (Open Graph, Twitter Cards, JSON-LD), into compact URLs. It’s perfect for testing how web pages render on social platforms, prototyping lightweight HTML snippets, or sharing temporary web content without server storage.

The tool is hosted at: **[onthefly.dobuki.net](https://onthefly.dobuki.net)**.

![icon](icon.png)

## Features

- **Compress HTML**: Encode full HTML pages, including metadata, into URLs.
- **Social Metadata Testing**: Preview and tweak Open Graph, Twitter Cards, and JSON-LD for social sharing.
- **No Server Storage**: Pages are generated from URL parameters, powered by Cloudflare Workers for low-cost serving.
- **Editor Interface**: Use the hosted tool to edit HTML, add metadata, and generate shareable links.
- **Versatile Uses**: Share prototypes, create educational demos, or test layouts on the fly.

## Usage

### Online Tool

Visit **[onthefly.dobuki.net](https://onthefly.dobuki.net)** to use the interactive editor:

1. Enter or paste HTML into the textarea.
2. Add social metadata or JSON-LD with one-click buttons.
3. Edit metadata fields (title, description, image, URL) in the right panel.
4. Share the compressed URL to test or demo your page.

The editor dynamically updates the browser URL with `?edit=1` for editing, while the shareable link uses `?u=...` for rendering.

### Library

Install the library via npm:

```bash
npm install compress-to-url
```

### Use it to compress or decompress HTML

```javascript
const { compressToUrl, decompressFromUrl } = require('compress-to-url');

async function example() {
  const html = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
  
  // Compress
  const { payload } = await compressToUrl(html, { inputType: 'string', mimeType: 'text/html' });
  console.log('Compressed URL:', payload);
  
  // Decompress
  const { data } = await decompressFromUrl(payload);
  console.log('Decompressed HTML:', data);
}

example();
```

## Build

To build the library:

```bash
./build.sh
```

## Run Example

To run the local example:

```bash
./sample.sh
```

## Motivation

This project started as a way to test social media metadata on the fly, without hosting or complex setups. Built as an experiment in Vibe coding (intuitive, flow-driven development), it uses Cloudflare Workers to serve pages serverlessly. To avoid storage costs, all content is encoded in the URL itself, making every page self-contained.

## Technical Details

Cloudflare Workers: Enables server-side rendering for social platform scraping, keeping costs low.
No Storage: Pages are generated from URL parameters, eliminating database needs.
React + TypeScript: The editor is built for a smooth, interactive experience.
Compression: Efficiently encodes HTML to fit within URL length limits.
Contributing
Feel free to open issues or submit pull requests on GitHub. Feedback and ideas are welcome!

## Github Source

<https://github.com/jacklehamster/compress-to-url>
