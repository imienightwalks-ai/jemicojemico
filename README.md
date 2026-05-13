# Jemico's Book Quotes Library

A premium, responsive Next.js quote library with public read-only browsing and admin-only content management backed by Supabase.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, Realtime, Row Level Security
- OpenLibrary cover lookup API route
- Vercel-ready deployment

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_ADMIN_EMAIL=you@example.com
```

3. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run the contents of `supabase-schema.sql`.
4. Replace and run this line in the SQL editor:

```sql
alter database postgres set app.admin_email = 'you@example.com';
```

5. In Supabase Auth, enable email magic links.
6. Add your deployed Vercel URL to Supabase Auth redirect URLs.

Public visitors can read all books and quotes through RLS `select` policies. Inserts, updates, and deletes are allowed only when the signed-in user email matches the configured admin email.

## Deployment

1. Push this project to GitHub.
2. Import it in Vercel.
3. Add the three environment variables from `.env.example`.
4. Deploy.

The app is safe to publish publicly: visitors see all content in view mode, while admin controls render only for the configured admin account.
