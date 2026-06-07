/* ----------------------------------------------------------------------------
   Minimal OpenRouter client (called client-side; key lives in localStorage).
   Endpoint + auth verified against openrouter.ai/docs.
---------------------------------------------------------------------------- */

const BASE = 'https://openrouter.ai/api/v1';

export interface ModelInfo {
  id: string;
  name: string;
}

function headers(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    // Optional attribution headers (safe to send from the browser).
    'HTTP-Referer': location.origin,
    'X-Title': 'DrumScore',
  };
}

export async function listModels(key?: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${BASE}/models`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data ?? [])
      .map((m: any) => ({ id: String(m.id), name: String(m.name ?? m.id) }))
      .filter((m: ModelInfo) => m.id);
  } catch {
    return [];
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(
  key: string,
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300) || res.statusText}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('OpenRouter returned no content.');
  return content;
}

/** Pull a JSON object out of a model response (tolerates code fences / prose). */
export function extractJson(content: string): any {
  let s = content.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(s);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}
