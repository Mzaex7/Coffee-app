// Supabase Edge Function: delete-account
//
// Permanently deletes the calling user's account (App Store Guideline 5.1.1(v)
// requires in-app account deletion). The caller is identified via their JWT;
// the actual deletion needs the service-role key, which only exists here
// server-side. All user data (profiles, coffees, grinders, brew_logs,
// advice_logs) cascades via ON DELETE CASCADE on auth.users.
//
// Deploy: supabase functions deploy delete-account
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// into Edge Functions automatically — no extra secrets needed.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

    try {
        const authHeader = req.headers.get('Authorization') ?? '';
        if (!authHeader) return json({ error: 'Missing Authorization header.' }, 401);

        // Resolve the caller from their JWT (anon key alone has no user).
        const caller = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } },
        );
        const { data: { user }, error: userError } = await caller.auth.getUser();
        if (userError || !user) return json({ error: 'Not signed in.' }, 401);

        // Service-role client performs the deletion.
        const admin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
        if (deleteError) return json({ error: `Deletion failed: ${deleteError.message}` }, 500);

        return json({ ok: true });
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});
