# Environment Setup Guide

## Current Architecture: Client-Side Only
Since this project is currently a static HTML/JS site, all API keys effectively live in the client-side code (`script.js`).

**Current Keys (Found in script.js):**
- `supabaseUrl`: `https://duhesaxygyxshmevovuj.supabase.co`
- `supabaseKey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (Anon Key)

## Security Warning
> [!WARNING]
> The text above contains your *Anon Public Key*. This is generally safe for client-side operations (like login/signup) as long as your Supabase Row Level Security (RLS) policies are configured correctly.
> **Never** expose your `SERVICE_ROLE_KEY` in this codebase.

## Transitioning to Vercel Environment Variables
If you upgrade this project to a framework like Next.js or use Vercel Serverless Functions in the future, you should move these keys to Vercel:

1.  Go to Vercel Project Settings -> Environment Variables.
2.  Add:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3.  Update the code to use `process.env.NEXT_PUBLIC_SUPABASE_URL`.
