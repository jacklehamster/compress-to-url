/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Node.js zlib (dynamic import)
let zlib: typeof import('zlib') | undefined;
if (typeof process !== 'undefined' && process.versions?.node) {
  zlib = await import('zlib');
}

interface CompressOptions {
  maxSize?: number;
  inputType?: 'string' | 'binary';
  mimeType?: string;
  normalizeWhitespace?: boolean;
}

interface CompressResult {
  payload: string;
  size: number;
}

interface DecompressOptions {
  outputType?: 'string' | 'binary' | 'auto';
}

interface DecompressResult {
  data: string | Uint8Array;
  mimeType: string;
}

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!()*+-;<=>?@^_`{|}~',:/\"[]";

function base85Encode(bytes: Uint8Array): string {
  let result = '';
  let buffer = 0n;
  let bufferBits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8n) + BigInt(byte);
    bufferBits += 8;
    while (bufferBits >= 5) {
      bufferBits -= 5;
      const value = Number((buffer >> BigInt(bufferBits)) & 0x1fn);
      result += alphabet[value];
    }
  }

  if (bufferBits > 0) {
    const paddingBits = 5 - bufferBits;
    buffer <<= BigInt(paddingBits);
    const value = Number(buffer & 0x1fn);
    result += alphabet[value];
    const totalBytes = bytes.length;
    const paddingNeeded = (totalBytes % 4 === 0 ? 0 : 4 - (totalBytes % 4)) || 0;
    result += '~'.repeat(paddingNeeded);
  }

  return result;
}

function base85Decode(str: string): Uint8Array {
  let buffer = 0n;
  let bufferBits = 0;
  const bytes: number[] = [];

  const trimmedStr = str.replace(/~+$/, '');
  const paddingChars = str.length - trimmedStr.length;
  const totalBytesEstimate = Math.floor((trimmedStr.length * 5 - paddingChars * 8) / 8) || 1;

  for (const char of trimmedStr) {
    const value = alphabet.indexOf(char);
    if (value === -1) throw new Error('Invalid Base85 char');
    buffer = (buffer << 5n) + BigInt(value);
    bufferBits += 5;
    while (bufferBits >= 8) {
      bufferBits -= 8;
      bytes.push(Number((buffer >> BigInt(bufferBits)) & 0xffn));
    }
  }

  if (bufferBits > 0) {
    const shift = 8 - bufferBits;
    buffer <<= BigInt(shift);
    bytes.push(Number(buffer & 0xffn));
  }

  const expectedLength = totalBytesEstimate + paddingChars;
  while (bytes.length > expectedLength) bytes.pop();

  return new Uint8Array(bytes);
}

async function compressToUrl(input: string | ArrayBuffer | Uint8Array, options: CompressOptions = {}): Promise<CompressResult> {
  const { maxSize = 2083, inputType = 'string', mimeType = inputType === 'string' ? 'text/html' : 'application/octet-stream', normalizeWhitespace = false } = options;

  let data: Uint8Array;
  const encoder = new TextEncoder();
  if (inputType === 'string') {
    if (typeof input !== 'string') throw new Error('Expected string input for inputType "string"');
    data = encoder.encode(normalizeWhitespace ? input.replace(/\s+/g, ' ').trim() : input);
  } else if (inputType === 'binary') {
    if (typeof input === 'string') throw new Error('Expected binary input for inputType "binary"');
    data = input instanceof Uint8Array ? input : new Uint8Array(input);
  } else {
    throw new Error('Invalid inputType: use "string" or "binary"');
  }

  const mimePrefix = `${mimeType}:`;
  const mimePrefixBytes = encoder.encode(mimePrefix);
  const fullData = new Uint8Array(mimePrefixBytes.length + data.length);
  fullData.set(mimePrefixBytes);
  fullData.set(data, mimePrefixBytes.length);

  let compressedBytes: Uint8Array;
  if (zlib) {
    compressedBytes = await new Promise((resolve, reject) => {
      zlib.gzip(fullData, { level: 9 }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  } else {
    if (typeof CompressionStream === 'undefined') {
      throw new Error('CompressionStream unavailable; modern browser or Worker required');
    }
    const stream = new Blob([fullData]).stream();
    const compressedReadableStream = stream.pipeThrough(new CompressionStream('gzip'));
    const compressedResponse = await new Response(compressedReadableStream);
    const blob = await compressedResponse.blob();
    const buffer = await blob.arrayBuffer();
    compressedBytes = new Uint8Array(buffer);
  }

  const payload = base85Encode(compressedBytes);
  const size = payload.length;
  if (size > maxSize) {
    throw new Error(`Compressed payload (${size} chars) exceeds max URL size (${maxSize} chars)`);
  }

  return { payload, size };
}

async function decompressFromUrl(payload: string, options: DecompressOptions = {}): Promise<DecompressResult> {
  const { outputType = 'auto' } = options;

  const compressedBytes = base85Decode(payload);

  let decompressedBytes: Uint8Array;
  if (zlib) {
    decompressedBytes = await new Promise((resolve, reject) => {
      zlib.gunzip(compressedBytes, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  } else {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream unavailable; modern browser or Worker required');
    }
    const stream = new Blob([compressedBytes]).stream();
    const decompressedReadableStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const decompressedResponse = await new Response(decompressedReadableStream);
    const blob = await decompressedResponse.blob();
    const buffer = await blob.arrayBuffer();
    decompressedBytes = new Uint8Array(buffer);
  }

  // Find the colon byte (ASCII 58) to separate MIME type and data
  const colonIndex = decompressedBytes.indexOf(58);
  if (colonIndex === -1) {
    throw new Error('MIME type not found in payload');
  }

  const decoder = new TextDecoder();
  const mimeType = decoder.decode(decompressedBytes.subarray(0, colonIndex));
  const dataBytes = decompressedBytes.subarray(colonIndex + 1);

  const isTextType = mimeType.startsWith('text/') || mimeType === 'application/json';
  const returnAsString = outputType === 'string' || (outputType === 'auto' && isTextType);

  if (returnAsString) {
    return { data: decoder.decode(dataBytes), mimeType };
  }
  return { data: dataBytes, mimeType };
}

export { compressToUrl, decompressFromUrl, CompressOptions, CompressResult, DecompressOptions, DecompressResult };

if (typeof window !== 'undefined') {
  (window as any).compressToUrl = compressToUrl;
  (window as any).decompressFromUrl = decompressFromUrl;
}
