import { expect, it, describe } from 'bun:test';
import { compressToUrl } from './index';

describe('hello', () => {
    it('shows Hello World', async () => {
        console.log(await compressToUrl("Hello world"));
    });
});
