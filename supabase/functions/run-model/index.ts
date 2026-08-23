import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': 'https://www.aiamigos.org', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const limit = (value: unknown, max: number) => String(value ?? '').slice(0, max);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  const auth = request.headers.get('Authorization');
  if (!auth) return json({ error: 'Sign in is required for automated model runs.' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Valid user session required.' }, 401);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const provider = limit(body.provider, 32).toLowerCase();
  const model = limit(body.model, 120);
  const input = limit(body.input, 24000);
  const credential = limit(body.credential, 512);
  if (!provider || !model || !input || !credential) return json({ error: 'provider, model, input, and credential are required.' }, 400);
  try {
    let response;
    if (provider === 'openai') response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input, store: false }) });
    else if (provider === 'anthropic') response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': credential, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: input }] }) });
    else if (provider === 'gemini') response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(credential)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: input }] }] }) });
    else return json({ error: 'Unsupported provider.' }, 400);
    const raw = await response.text();
    if (!response.ok) return json({ error: 'The provider rejected this run.', providerStatus: response.status }, 502);
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw); } catch { return json({ error: 'Provider returned invalid JSON.' }, 502); }
    const output = provider === 'openai' ? parsed.output_text : provider === 'anthropic' ? (parsed.content as Array<{ text?: string }> | undefined)?.map((item) => item.text ?? '').join('\n') : (parsed.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n');
    if (!output) return json({ error: 'Provider returned no text output.' }, 502);
    return json({ provider, model, output: String(output), saved: false });
  } catch {
    return json({ error: 'Model run failed. Use manual import if the provider is unavailable.' }, 502);
  }
});
