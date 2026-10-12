export type TaskResult = {
  taskId: string;
  traceId: string;
  status: 'pending' | 'succeeded' | 'failed';
  success: boolean;
  mediaUrls: string[];
  costCredits: number | null;
};

export type GenerateInput = {
  prompt: string;
  model: string;
  size: string;
  watermark: boolean;
};

export type EditInput = GenerateInput & { imageUrl: string };


const GENERATE_PATH = '/seedream/images';
const TASK_PATH = '/seedream/tasks';
const successful = new Set(['succeeded', 'success', 'complete', 'completed', 'finished']);
const failed = new Set(['failed', 'failure', 'error', 'cancelled', 'canceled', 'rejected']);
const pending = new Set(['pending', 'queued', 'processing', 'running', 'in_progress', 'accepted', 'submitted', 'waiting']);
const mediaKeys = new Set(['url', 'image_url', 'audio_url', 'video_url', 'file_url', 'media_url']);

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function id(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function mediaUrls(value: unknown): string[] {
  const urls = new Set<string>();
  function visit(node: unknown): void {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const data = obj(node);
    if (!data) return;
    for (const [key, child] of Object.entries(data)) {
      if (mediaKeys.has(key) && typeof child === 'string' && /^https:\/\//.test(child)) urls.add(child);
      else if (key === 'media_urls' && Array.isArray(child)) {
        for (const item of child) if (typeof item === 'string' && /^https:\/\//.test(item)) urls.add(item);
      } else if (['data', 'content', 'result', 'response', 'output', 'images', 'audios', 'videos', 'items', 'task'].includes(key)) visit(child);
    }
  }
  visit(value);
  return [...urls];
}

export function normalizeTask(body: unknown, fallbackTaskId = ''): TaskResult {
  const data = obj(body);
  if (!data) throw new Error('Ace Data Cloud returned an invalid task response.');
  let responseValue: unknown = data.response;
  if (typeof responseValue === 'string') {
    try { responseValue = JSON.parse(responseValue); } catch { responseValue = null; }
  }
  const response = obj(responseValue);
  const task = obj(data.task);
  const taskId = id(data.task_id) || id(data.id) || id(task?.id) || id(response?.task_id) || fallbackTaskId;
  const traceId = str(data.trace_id) || str(response?.trace_id) || str(task?.trace_id);
  const states = [data.status, data.state, task?.status, task?.state, response?.status, response?.state]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase());
  const urls = [...new Set([...mediaUrls(data), ...mediaUrls(response)])];
  const unfinished = 'finished_at' in data && data.finished_at == null;
  const hasFailure = states.some((state) => failed.has(state)) || data.success === false || response?.success === false || Boolean(data.error) || Boolean(response?.error);
  const isPending = unfinished || states.some((state) => pending.has(state));
  const hasSuccess = states.some((state) => successful.has(state)) || response?.success === true || urls.length > 0;
  const outerPending = (typeof data.status === 'string' && pending.has(data.status.toLowerCase())) || (typeof data.state === 'string' && pending.has(data.state.toLowerCase()));
  const status: TaskResult['status'] = outerPending ? 'pending' : hasFailure ? 'failed' : isPending ? 'pending' : hasSuccess ? 'succeeded' : 'pending';
  const cost = obj(response?.cost) ?? obj(data.cost);
  const amount = cost?.amount;
  return {
    taskId, traceId, status, success: status === 'succeeded',
    mediaUrls: status === 'succeeded' ? urls : [],
    costCredits: typeof amount === 'number' && Number.isFinite(amount) ? amount : null
  };
}

async function post(path: string, apiKey: string, payload: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Promise<unknown> {
  const key = apiKey.trim();
  if (!key || /^Bearer\s/i.test(key)) throw new Error('Enter the Ace Data Cloud API key without the Bearer prefix.');
  let response: Response;
  try {
    response = await fetch('https://api.acedata.cloud' + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(payload),
      redirect: 'error',
      signal: AbortSignal.timeout(60000)
    });
  } catch {
    throw new Error('Connection failed. Check the original request history before submitting again.');
  }
  if (!response.ok) throw new Error('Ace Data Cloud HTTP ' + response.status + '. Check key, service access, balance, and request history.');
  try { return await response.json(); }
  catch { throw new Error('Ace Data Cloud returned invalid JSON. Check request history.'); }
}

export async function submitGeneration(input: GenerateInput, apiKey: string): Promise<TaskResult> {
  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    model: input.model,
    size: input.size,
    watermark: input.watermark,
    async: true,
    stream: false,
    response_format: 'url',
  };
  const body = await post(GENERATE_PATH, apiKey, payload);
  const result = normalizeTask(body);
  if (result.status === 'pending' && !result.taskId) throw new Error('Generation was accepted without a task ID. Check request history before retrying.');
  return result;
}

export async function submitEdit(input: EditInput, apiKey: string): Promise<TaskResult> {
  const payload: Record<string, unknown> = { prompt: input.prompt, model: input.model, size: input.size, watermark: input.watermark, image: input.imageUrl, async: true, stream: false, response_format: 'url' };
  const body = await post(GENERATE_PATH, apiKey, payload);
  const result = normalizeTask(body);
  if (result.status === 'pending' && !result.taskId) throw new Error('Edit was accepted without a task ID. Check request history before retrying.');
  return result;
}

export async function retrieveTask(taskId: string, apiKey: string): Promise<TaskResult> {
  const body = await post(TASK_PATH, apiKey, { action: 'retrieve', id: taskId });
  return normalizeTask(body, taskId);
}

export async function retrieveTasks(taskIds: string[], apiKey: string): Promise<{ status: 'pending' | 'succeeded' | 'failed'; success: boolean; taskIds: string[]; mediaUrls: string[]; items: TaskResult[] }> {
  if (taskIds.length === 0 || taskIds.length > 20 || taskIds.some((taskId) => !taskId.trim())) {
    throw new Error('Provide 1 to 20 existing task IDs.');
  }
  const body = await post(TASK_PATH, apiKey, { action: 'retrieve_batch', ids: taskIds });
  const envelope = obj(body);
  const rawItems = Array.isArray(body)
    ? body
    : Array.isArray(envelope?.items) ? envelope.items
    : Array.isArray(envelope?.tasks) ? envelope.tasks
    : Array.isArray(envelope?.data) ? envelope.data
    : [];
  const items = rawItems.map((item, index) => normalizeTask(item, taskIds[index] ?? ''));
  const status = items.length === 0 || items.some((item) => item.status === 'pending')
    ? 'pending'
    : items.some((item) => item.status === 'failed') ? 'failed' : 'succeeded';
  return {
    status,
    success: status === 'succeeded',
    taskIds,
    mediaUrls: status === 'succeeded' ? [...new Set(items.flatMap((item) => item.mediaUrls))] : [],
    items
  };
}
