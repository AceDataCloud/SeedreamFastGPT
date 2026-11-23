import { afterEach, expect, test, vi } from 'vitest';
import plugin from '../index.ts';
import { submitGeneration, submitEdit } from './client.ts';
afterEach(() => vi.unstubAllGlobals());
for (const model of ['doubao-seedream-5-0-pro-260628', 'doubao-seedream-5-0-lite-260128']) {
  for (const operation of ['generate', 'editImage']) test(`${model} ${operation} preserves async polling without a stream field`, async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task_id: 'existing-test', status: 'pending' }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const input = plugin.getToolHandler(operation)!.inputSchema.parse({ model, prompt: 'One blue paper sphere', imageUrl: 'https://example.com/authorized.png' });
    await (operation === 'generate' ? submitGeneration : submitEdit)(input, 'test-key');
    expect(fetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetch.mock.calls[0]![1].body);
    expect(payload).toMatchObject({ model, size: '2K', async: true, response_format: 'url' });
    expect(payload).not.toHaveProperty('stream');
    if (operation === 'editImage') expect(payload.image).toBe('https://example.com/authorized.png');
  });
}
