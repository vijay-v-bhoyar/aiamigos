import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': 'https://www.aiamigos.org', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  const auth = request.headers.get('Authorization');
  if (!auth) return json({ error: 'Sign in required.' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Valid user session required.' }, 401);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const action = body.action === 'approve' ? 'approve' : 'submit';
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (action === 'submit') {
    const projectId = String(body.projectId ?? ''); const slug = String(body.slug ?? '').toLowerCase(); const snapshot = body.snapshot;
    if (!projectId || !slugPattern.test(slug) || !snapshot || body.license !== 'CC BY-SA 4.0') return json({ error: 'projectId, valid slug, snapshot, and CC BY-SA 4.0 are required.' }, 400);
    const { data, error } = await userClient.from('playbook_submissions').insert({ project_id: projectId, owner_id: user.id, slug, snapshot, license: 'CC BY-SA 4.0' }).select('id,slug,status').single();
    if (error) return json({ error: 'Submission could not be created.' }, 400);
    return json({ submission: data });
  }
  const submissionId = String(body.submissionId ?? '');
  const { data: reviewer } = await userClient.rpc('is_reviewer');
  if (!reviewer || !submissionId) return json({ error: 'Reviewer permission required.' }, 403);
  const { data: submission } = await admin.from('playbook_submissions').select('id,slug,snapshot,owner_id').eq('id', submissionId).eq('status', 'pending').single();
  if (!submission) return json({ error: 'Pending submission not found.' }, 404);
  const { data: profile } = await admin.from('profiles').select('public_handle').eq('id', submission.owner_id).single();
  const snapshot = { ...submission.snapshot, publication: { license: 'CC BY-SA 4.0', reviewedBy: user.id, reviewedAt: new Date().toISOString() } };
  const { error: publishError } = await admin.from('public_playbooks').insert({ submission_id: submission.id, slug: submission.slug, title: snapshot.title ?? submission.slug, summary: snapshot.goal ?? 'Verified AI practice playbook', snapshot, author_handle: profile?.public_handle ?? 'AI Amigos contributor' });
  if (publishError) return json({ error: 'Public snapshot could not be created.' }, 400);
  await admin.from('playbook_submissions').update({ status: 'approved', reviewer_id: user.id, reviewed_at: new Date().toISOString() }).eq('id', submission.id);
  return json({ status: 'approved', slug: submission.slug });
});
