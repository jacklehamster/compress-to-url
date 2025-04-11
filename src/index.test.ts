/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { compressToUrl, decompressFromUrl, CompressResult, DecompressResult } from './index';

describe('compressToUrl and decompressFromUrl', () => {
    // Helper to check round-trip compression/decompression
    async function testRoundTrip(input: string, description: string) {
        const compressed: CompressResult = await compressToUrl(input);
        expect(compressed.payload).toMatch(/^[0-9A-Za-z!()*+-;<=>?@^_`{|}~',:/"[\]]+$/); // Base90 chars only
        expect(compressed.size).toBe(compressed.payload.length);

        const decompressed: DecompressResult = await decompressFromUrl(compressed.payload);
        expect(decompressed.data).toBe(input);
        expect(decompressed.mimeType).toBe('text/html');
    }

    // Test 1: Basic ASCII characters
    it('handles basic ASCII characters', async () => {
        const input = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        await testRoundTrip(input, 'basic ASCII');
    });

    // Test 2: Special characters from Base90 alphabet
    it('handles special characters in alphabet', async () => {
        const input = '!()*+-;<=>?@^_`{|}~\',:/"[]'; // All 28 special chars
        await testRoundTrip(input, 'special chars');
    });

    // Test 3: Unicode accented letters
    it('handles Unicode accented letters', async () => {
        const input = 'éèêëñõøç'; // UTF-8 multi-byte chars
        await testRoundTrip(input, 'accented letters');
    });

    // Test 4: Emojis (complex Unicode)
    it('handles emojis', async () => {
        const input = 'Hello 😂👍 World 🌍'; // Emojis as 4-byte UTF-8
        await testRoundTrip(input, 'emojis');
    });

    // Test 5: Full HTML with mixed characters
    it('handles full HTML with mixed characters', async () => {
        const input = `<!DOCTYPE html>
<html>
  <head>
    <title>Test €</title>
  </head>
  <body>
    <p>Hello, World! 🌟 © 2023</p>
    <script>console.log("!()*+-;<=>?@^_\`{|}~',:/\\"[]");</script>
  </body>
</html>`;
        await testRoundTrip(input, 'full HTML');
    });

    // Test 6: Empty string
    it('handles empty string', async () => {
        const input = '';
        const compressed = await compressToUrl(input);
        const decompressed = await decompressFromUrl(compressed.payload);
        expect(decompressed.data).toBe('');
        expect(decompressed.mimeType).toBe('text/html');
    });

    // Test 7: Max size limit
    it('throws on exceeding max size', async () => {
        const largeInput = 'a'.repeat(10000); // Large enough to exceed 2083 chars
        await expect(compressToUrl(largeInput, { maxSize: 10 })).rejects.toThrow(
            /Compressed payload \(\d+ chars\) exceeds max URL size \(10 chars\)/
        );
    });

    // Test 8: Binary input
    it('handles binary input', async () => {
        const binary = new Uint8Array([0, 255, 127, 128, 65]); // Mix of byte values
        const compressed = await compressToUrl(binary, { inputType: 'binary', mimeType: 'application/octet-stream' });
        const decompressed = await decompressFromUrl(compressed.payload, { outputType: 'binary' });
        expect(decompressed.data).toBeInstanceOf(Uint8Array);
        expect((decompressed.data as Uint8Array)).toEqual(binary);
        expect(decompressed.mimeType).toBe('application/octet-stream');
    });

    // Test 9: Invalid Base85 char in decompress
    it('throws on invalid Base85 char', async () => {
        const invalidPayload = 'abc&def'; // & not in alphabet
        await expect(decompressFromUrl(invalidPayload)).rejects.toThrow('Invalid Base85 char');
    });

    // Test 10: Whitespace normalization
    it('normalizes whitespace when requested', async () => {
        const input = '  Hello   \n\t  World  ';
        const compressed = await compressToUrl(input, { normalizeWhitespace: true });
        const decompressed = await decompressFromUrl(compressed.payload);
        expect(decompressed.data).toBe('Hello World');
    });

    // Test 11: Non-string input with string type
    it('throws on invalid input type (non-string)', async () => {
        await expect(compressToUrl(new Uint8Array([65]), { inputType: 'string' })).rejects.toThrow(
            'Expected string input for inputType "string"'
        );
    });

    // Test 12: String input with binary type
    it('throws on invalid input type (string as binary)', async () => {
        await expect(compressToUrl('Hello', { inputType: 'binary' })).rejects.toThrow(
            'Expected binary input for inputType "binary"'
        );
    });

    // Test 13: All printable ASCII in alphabet
    it('handles all printable ASCII in alphabet', async () => {
        const input = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!()*+-;<=>?@^_`{|}~\',:/"[]';
        await testRoundTrip(input, 'all printable ASCII in alphabet');
    });

    // Test 14: Mixed ASCII, special chars, and Unicode near max size
    it('handles mixed characters near max size', async () => {
        const base = '0123456789ABCXYZabcxyz!()*+-;<=>?@^_`{|}~\',:/"[]é😂';
        const input = base.repeat(40); // Approx 2000 chars, close to 2083 limit
        await testRoundTrip(input, 'mixed near max size');
    });

    // Test 15: Special chars with whitespace and newlines
    it('handles special chars with whitespace and newlines', async () => {
        const input = '!()*+-\n;<=>?\t@^_`{|}~\r\n,\':/"[]';
        await testRoundTrip(input, 'special chars with whitespace');
    });

    // Test 16: Single char from each alphabet group
    it('handles single char from each group', async () => {
        const input = '0AZaz!()+-;<=>?@^_`{|}~\',:/"[]'; // One from digits, upper, lower, each special
        await testRoundTrip(input, 'single char per group');
    });
});
