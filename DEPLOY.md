# BrewRef — Deployment Guide

BrewRef is now a cloud platform: a **Supabase** backend (Postgres + Auth + Row
Level Security + an Edge Function) and an **Expo** client that ships to web (and
runs on iOS/Android via Expo Go or a dev build).

This guide covers the one-time account setup that can't be scripted, then the
deploy. Copy-paste the commands as you go.

---

## 1. Create the Supabase project

1. Sign up / log in at <https://supabase.com> and create a new project (free tier
   is fine). Pick a strong database password and a nearby region.
2. Once it's provisioned, open **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public key**
   - **service_role key** (keep this secret — only used by the CLI/server)
3. Note your **project ref** (the `abcd1234` part of the URL).

## 2. Install & link the Supabase CLI

```bash
npm install -g supabase            # or: brew install supabase/tap/supabase
supabase login                     # opens a browser to authorize
supabase link --project-ref <your-project-ref>
```

## 3. Apply the database schema

The migrations in `supabase/migrations/` create the tables, Row Level Security
policies, the new-user trigger, and the anonymized community function.

```bash
supabase db push
```

> This applies `0001_init.sql` (profiles, coffees, grinders, brew_logs + RLS) and
> `0002_community.sql` (the `get_community_bean_stats` SECURITY DEFINER function).

## 4. Deploy the AI Edge Function (keeps the Gemini key off the client)

```bash
# Store the Gemini key as a server-side secret (NEVER in the app bundle):
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_KEY

# Deploy the function:
supabase functions deploy brew-advice
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected into Edge Functions
automatically, so no extra secrets are needed for the community lookup.

## 5. Configure the client `.env`

```bash
cp .env.example .env
```

Fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

The anon key is meant to be public — RLS is what protects user data. The Gemini
key is **not** here (it lives only as the Edge Function secret from step 4).

## 6. Run locally

```bash
npm install
npx expo start --web      # or --ios / --android
```

Sign up with an email + password. (By default Supabase sends a confirmation
email; to skip that during development, turn off **Authentication → Providers →
Email → Confirm email** in the dashboard.)

---

## 7. Ship the web build

```bash
npx expo export -p web     # outputs static site to ./dist
```

Deploy `./dist` to any static host. Easiest options:

### Vercel
```bash
npm i -g vercel
vercel deploy ./dist --prod
```
Then add the two `EXPO_PUBLIC_SUPABASE_*` variables in **Vercel → Project →
Settings → Environment Variables** and redeploy. (Or set them before exporting so
they're inlined into the bundle.)

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --dir=dist --prod
```
Set the same env vars under **Site settings → Environment variables**.

> Because Expo inlines `EXPO_PUBLIC_*` values at **build time**, the simplest path
> is to keep them in `.env` and run `npx expo export -p web` locally, then upload
> the resulting `dist/`.

---

## 8. (Optional) Mobile builds

Web is the primary delivery surface. For installable mobile apps later:

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p ios --profile preview     # or -p android
```

This needs an Expo account (and, for store distribution, Apple/Google developer
accounts). Not required for the cloud platform itself.

---

## Verifying the community feature

1. Sign up **two** accounts (two browsers / incognito).
2. In account A: add a bean (e.g. *The Barn · Ethiopia Sidamo*), log several shots
   on it, and rate the good ones ≥ 4★. Ensure **Settings → Share my brews** is on.
3. In account B: add the **same** bean (same roastery + name), log a poor shot,
   open the **Brew Doctor** and tap *Get AI Advice*. The diagnosis card should show
   a *"Backed by N brewers · M shots on this bean"* line.
4. Turn **Share my brews** off in account A → re-run B → the community line
   disappears (the RPC filters out non-sharing users and enforces k-anonymity:
   ≥ 3 shots from ≥ 2 distinct users).

## Security checklist

- The Gemini key exists **only** as the `GEMINI_API_KEY` Edge Function secret.
  Confirm it never reaches the web bundle: `grep -r "AIza" dist/` → no matches.
- `.env` is gitignored; only `.env.example` (placeholders) is committed.
- RLS denies any cross-user row access; cross-user data is exposed solely as
  anonymized aggregates by `get_community_bean_stats`.
