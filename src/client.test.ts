import { afterEach, expect, test, vi } from 'vitest';
import { normalizeTask, retrieveTask, submitGeneration } from './client.js';

afterEach(() => vi.unstubAllGlobals());

test('submits one generation to the fixed service endpoint', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task_id: 'task-1', status: 'pending' }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const result = await submitGeneration({"prompt": "A single blue paper sphere on a cream background, studio product photograph, no text.", "model": "doubao-seedream-5-0-lite-260128", "size": "2K", "watermark": false}, 'test-key');
  expect(result).toMatchObject({ taskId: 'task-1', status: 'pending', success: false });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('https://api.acedata.cloud/seedream/images');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({"prompt": "A single blue paper sphere on a cream background, studio product photograph, no text.", "model": "doubao-seedream-5-0-lite-260128", "size": "2K", "watermark": false});
});

test('retrieves the same task and its terminal media URL without generating', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    id: 'task-1', finished_at: 123,
    response: { success: true, data: [{ image_url: 'https://cdn.example/result.png' }], cost: { amount: 0.099 } }
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const result = await retrieveTask('task-1', 'test-key');
  expect(result).toMatchObject({ taskId: 'task-1', status: 'succeeded', success: true, costCredits: 0.099 });
  expect(result.mediaUrls).toEqual(['https://cdn.example/result.png']);
  expect(fetch.mock.calls[0][0]).toBe('https://api.acedata.cloud/seedream/tasks');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ action: 'retrieve', id: 'task-1' });
});

test('unfinished task is pending even when a partial response exists', () => {
  expect(normalizeTask({ id: 'task-1', finished_at: null, response: { success: true } }).status).toBe('pending');
});

test('HTTP errors and validation never expose secrets', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'private upstream secret' } }), { status: 403 })));
  await expect(retrieveTask('task-1', 'private-key')).rejects.toThrow('HTTP 403');
  await expect(retrieveTask('task-1', 'Bearer private-key')).rejects.toThrow('without the Bearer prefix');
});
