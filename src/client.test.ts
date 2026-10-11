import { afterEach, expect, test, vi } from 'vitest';
import { normalizeTask, retrieveTask, submitEdit, submitGeneration } from './client.js';

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

test('pending envelope remains pending even with nested success and media', () => {
  const task = normalizeTask({
    task_id: 'task-pending', status: 'processing',
    response: { success: true, data: [{ url: 'https://cdn.example/partial.png' }] }
  });
  expect(task.status).toBe('pending');
  expect(task.success).toBe(false);
  expect(task.mediaUrls).toEqual([]);
});

test('explicit nested failure takes precedence over an unfinished timestamp', () => {
  const task = normalizeTask({
    task_id: 'task-failed', finished_at: null,
    response: { status: 'failed', error: { message: 'private upstream' } }
  });
  expect(task.status).toBe('failed');
  expect(task.success).toBe(false);
  expect(task.mediaUrls).toEqual([]);
});

test('outer pending status wins over nested failure details', () => {
  const task = normalizeTask({
    task_id: 'task-pending-error', status: 'processing', finished_at: null,
    response: { success: false, error: { message: 'partial failure' } }
  });
  expect(task.status).toBe('pending');
  expect(task.success).toBe(false);
});

test('nested task state remains pending despite a partial media URL', () => {
  const task = normalizeTask({
    task: { id: 'task-nested', state: 'queued' },
    response: { data: [{ url: 'https://cdn.example/partial.png' }] }
  });
  expect(task.status).toBe('pending');
  expect(task.mediaUrls).toEqual([]);
});

test('completed task extracts media from a JSON-string response', () => {
  const task = normalizeTask({
    id: 'task-complete', finished_at: 123,
    response: JSON.stringify({ success: true, data: [{ url: 'https://cdn.example/final.png' }] })
  });
  expect(task.status).toBe('succeeded');
  expect(task.mediaUrls).toEqual(['https://cdn.example/final.png']);
});

test('edit submits once to the fixed service endpoint', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task_id: 'edit-task', status: 'pending' }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const result = await submitEdit({ prompt: 'Make it blue', imageUrl: 'https://cdn.example/source.png', model: 'doubao-seedream-5-0-lite-260128', size: '2K', watermark: false }, 'test-key');
  expect(result).toMatchObject({ taskId: 'edit-task', status: 'pending', success: false });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('https://api.acedata.cloud/seedream/images');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ image: 'https://cdn.example/source.png', async: true, stream: false, response_format: 'url' });
});
