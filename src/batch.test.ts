import { afterEach, describe, expect, it, vi } from 'vitest';
import { retrieveTasks } from './client.ts';

afterEach(() => vi.unstubAllGlobals());

const completed = (id: string) => ({
  id,
  finished_at: 1,
  response: { success: true, data: [{ url: `https://example.com/${id}.png` }] }
});

describe('batch task identity and completeness', () => {
  it('does not mark an omitted task as completed or assign its ID by position', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [completed('second')] }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await retrieveTasks(['first', 'second'], 'test-key');
    expect(result.status).toBe('pending');
    expect(result.success).toBe(false);
    expect(result.mediaUrls).toEqual([]);
    expect(result.items[0].taskId).toBe('second');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: 'retrieve_batch', ids: ['first', 'second']
    });
  });

  it('requires every returned ID to belong to the requested tasks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      items: [completed('first'), completed('other')]
    })));
    const result = await retrieveTasks(['first', 'second'], 'test-key');
    expect(result.status).toBe('pending');
    expect(result.success).toBe(false);
  });

  it('does not invent an ID for an unidentified response item', async () => {
    const { id: _id, ...unidentified } = completed('first');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ items: [unidentified] })));
    const result = await retrieveTasks(['first'], 'test-key');
    expect(result.status).toBe('pending');
    expect(result.success).toBe(false);
    expect(result.items[0].taskId).toBe('');
  });

  it('accepts complete successful items in a different order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      items: [completed('second'), completed('first')]
    })));
    const result = await retrieveTasks(['first', 'second'], 'test-key');
    expect(result.status).toBe('succeeded');
    expect(result.success).toBe(true);
    expect(result.items.map(item => item.taskId)).toEqual(['second', 'first']);
  });
});
