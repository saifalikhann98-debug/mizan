# Backend setup — real cross-user persistence (Supabase)

Mizan runs on a local fallback out of the box (submissions stay on one device). To make
submissions persist **across users** — the P0 launch requirement — point it at a free
Supabase project. ~5 minutes, no server of ours to deploy.

## Why Supabase
Postgres + an auto REST API callable straight from this static file. The `anon` key is
**public by design** — safe to ship in `index.html`. Access is enforced by Row Level
Security (RLS): anonymous visitors may read and add prices, never edit or delete them.
SQL also grows directly into the P1 data-integrity work (outlier trimming, verified tier).

## 1. Create the project
1. Sign up at https://supabase.com (free tier, no card).
2. **New project** → name it `mizan`, pick a region near the UAE (closest available, e.g.
   `eu-central`), set a database password (you won't need it for this).
3. Wait ~2 min for it to provision.

## 2. Create the table + security rules
Open **SQL Editor → New query**, paste this, and **Run**:

```sql
-- Real, buy-side prices people report paying.
create table if not exists public.submissions (
  id          bigint generated always as identity primary key,
  category    text        not null,
  area        text        not null,
  price       integer     not null check (price > 0 and price < 1000000),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists submissions_cat_area_idx
  on public.submissions (category, area, created_at desc);

-- Row Level Security: anon may READ + ADD, never edit or delete.
alter table public.submissions enable row level security;

create policy "anon can read submissions"
  on public.submissions for select to anon using (true);

create policy "anon can add submissions"
  on public.submissions for insert to anon with check (
    char_length(category) <= 40
    and char_length(area) <= 60
    and (note is null or char_length(note) <= 80)
    and price > 0 and price < 1000000
  );
```

There are deliberately **no** update/delete policies — under RLS that means anon can't
edit or delete anything. The length/price checks are a first thin guard; real anti-gaming
(per-device caps, IQR outlier trimming, weighting) is the P1 backlog.

## 3. Wire the keys into the app
**Project Settings → API**, copy:
- **Project URL** → `SUPABASE_URL`
- **anon / public** key → `SUPABASE_ANON_KEY`

Paste both into the config block at the top of the `<script>` in `index.html`:

```js
const SUPABASE_URL='https://YOURPROJECT.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGci...';   // the anon/public key
```

> Never paste the **service_role** key — it bypasses RLS and must stay secret.

## 4. Verify
1. Reload the app; in the browser console `store.adapter` should print `"supabase"`.
2. Add a price → it appears in **Table Editor → submissions** in Supabase.
3. Open the app in another browser / incognito → your price is there too.
4. Confirm only **real** submissions are in the table — the synthetic seed is never sent.

## Fallback behaviour
If the keys are blank or Supabase is unreachable, the app degrades gracefully: it keeps
working on the local fallback and a submission shows "Saved on this device only" instead
of failing. Nothing breaks; it just isn't shared until the backend is reachable.

## 5. Verified tier (P1 provenance) — invoice photos

A report can optionally carry a photo of the invoice. Photos land in a **private** Storage
bucket, a human checks them, and checked reports get a **Verified** badge and count
**double** in the paid-range percentiles (stated openly in the app's explainer strip).
Photos are for verification only — they are **never** displayed anywhere, and the client
strips EXIF/GPS by re-encoding through a canvas before upload (≤ ~1 MB JPEG).

Open **SQL Editor → New query**, paste, **Run**:

```sql
-- columns for the verified tier
alter table public.submissions
  add column if not exists verified     boolean not null default false,
  add column if not exists invoice_path text;

-- tighten the insert policy: anon may attach a photo path, but can NEVER
-- self-mark a row verified — only the owner flips that, manually.
drop policy if exists "anon can add submissions" on public.submissions;
create policy "anon can add submissions"
  on public.submissions for insert to anon with check (
    char_length(category) <= 40
    and char_length(area) <= 60
    and (note is null or char_length(note) <= 80)
    and price > 0 and price < 1000000
    and verified = false
    and (invoice_path is null or char_length(invoice_path) <= 200)
  );

-- private invoices bucket: 2 MB server-side cap (client targets ≤1 MB), JPEG only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

-- anon may UPLOAD only. No select/list/update/delete policies exist, so under RLS
-- the bucket is write-only from the app: nobody can read a photo with the anon key.
drop policy if exists "anon can upload invoices" on storage.objects;
create policy "anon can upload invoices"
  on storage.objects for insert to anon
  with check (bucket_id = 'invoices');
```

Until this SQL has run, the apps still work: the `verified` select falls back to the
legacy column list, and a failed photo upload posts the price without the photo (with a
quiet toast) — the flow never blocks on the photo.

### Manual verification flow (no service key in any client)
The dashboard (`/dashboard`, private) lists reports that have a photo waiting. The anon
key deliberately cannot flip `verified`, so the flip happens in the Supabase dashboard:

1. Open **Storage → invoices** and preview the photo at the listed path. Does the
   invoice match the service, area and price?
2. If yes, **SQL Editor** (runs as `postgres`, bypasses RLS) — one-liner:

```sql
update public.submissions set verified = true where id = 123;  -- the id shown in /dashboard
```

Never make the bucket public, and never wire invoice paths into any public page —
photos are provenance evidence, not content.
