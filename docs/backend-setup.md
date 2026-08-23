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

## 5. Server-side anti-pump (P1) — applied 2026-08

The client-side guard (`submitGuard`) is a deterrent, not a defence — anyone can bypass the
browser. This migration enforces the same caps **in the database**, where they can't be skipped.
Paste into **SQL Editor → New query → Run**:

```sql
-- 5a. columns: anonymous device id (sent by the app) + server-stamped IP hash.
--     Both are PRIVATE — never readable by anon (see grants below).
alter table public.submissions add column if not exists device uuid;
alter table public.submissions add column if not exists ip_hash text;

create index if not exists submissions_device_idx on public.submissions (device, created_at desc);
create index if not exists submissions_ip_idx     on public.submissions (ip_hash, created_at desc);

-- 5b. column privacy: anon may read only the public columns.
revoke select on table public.submissions from anon;
grant  select (category, area, price, note, created_at) on public.submissions to anon;

-- 5c. the guard: BEFORE INSERT trigger enforcing sanity + rate caps.
--     SECURITY DEFINER so it can read the private columns anon can't.
create or replace function public.submissions_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  xff   text;
  ip    text;
  day   timestamptz := now() - interval '24 hours';
  mon   timestamptz := now() - interval '30 days';
  n     int;
begin
  -- stamp the caller's IP hash server-side (any client-sent value is overwritten)
  begin
    xff := coalesce((current_setting('request.headers', true))::json->>'x-forwarded-for','');
  exception when others then xff := ''; end;
  ip := nullif(trim(split_part(xff, ',', 1)), '');
  new.ip_hash := case when ip is null then null else md5('mizan1:'||ip) end;

  -- absolute price sanity (belt over the RLS braces)
  if new.price is null or new.price <= 0 or new.price >= 1000000 then
    raise exception 'MIZAN_LIMIT: price out of range';
  end if;

  -- per-IP backstop: device ids are trivially renewable, IPs much less so.
  -- 40/day is generous for launch scale (UAE CGNAT can put many homes behind one IP).
  if new.ip_hash is not null then
    select count(*) into n from public.submissions
      where ip_hash = new.ip_hash and created_at > day;
    if n >= 40 then raise exception 'MIZAN_LIMIT: too many reports from this connection today'; end if;
  end if;

  if new.device is not null then
    -- exact duplicate (device, service, area, price) within 30 days
    perform 1 from public.submissions
      where device = new.device and category = new.category and area = new.area
        and price = new.price and created_at > mon limit 1;
    if found then raise exception 'MIZAN_LIMIT: duplicate report'; end if;
    -- max 2 per service+area per day (mirrors the client cap)
    select count(*) into n from public.submissions
      where device = new.device and category = new.category and area = new.area and created_at > day;
    if n >= 2 then raise exception 'MIZAN_LIMIT: bucket limit reached'; end if;
    -- max 12 total per day
    select count(*) into n from public.submissions
      where device = new.device and created_at > day;
    if n >= 12 then raise exception 'MIZAN_LIMIT: daily limit reached'; end if;
  elsif new.ip_hash is not null then
    -- no device id (not the official client) → the same caps keyed on IP
    select count(*) into n from public.submissions
      where ip_hash = new.ip_hash and category = new.category and area = new.area and created_at > day;
    if n >= 2 then raise exception 'MIZAN_LIMIT: bucket limit reached'; end if;
    select count(*) into n from public.submissions
      where ip_hash = new.ip_hash and created_at > day;
    if n >= 12 then raise exception 'MIZAN_LIMIT: daily limit reached'; end if;
  end if;

  return new;
end $$;

drop trigger if exists submissions_guard on public.submissions;
create trigger submissions_guard before insert on public.submissions
  for each row execute function public.submissions_guard();

-- make PostgREST pick up the new columns immediately
notify pgrst, 'reload schema';
```

**How the pieces fit**
- The app sends an anonymous `device` UUID (localStorage `mizan:device`; no fingerprinting, no
  PII). Clearing site data resets it — that's what the per-IP caps are for.
- `ip_hash` is written by the trigger from the request headers, salted+hashed; the raw IP is
  never stored. Neither column is readable via the API (column-level grant).
- Rejections raise `MIZAN_LIMIT: …` → PostgREST returns HTTP 400 → the app shows a friendly
  "you've hit today's limit here" toast and does **not** pretend the price was saved.
- The client is deploy-order-safe: if the `device` column doesn't exist yet, it retries the
  insert without it, so nothing breaks between deploying the app and running this SQL.

**Testing** (safe — uses a category no app screen ever shows):
```
# 1st insert succeeds; the SAME command again must return 400 MIZAN_LIMIT: duplicate report
curl -s -X POST "https://weouzxiubblpsquxdeok.supabase.co/rest/v1/submissions" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"category":"test-antipump","area":"UAE","price":1,"device":"11111111-1111-4111-8111-111111111111"}'
```
Delete test rows afterwards in Table Editor (as owner): `delete from submissions where category like 'test-%';`

## 6. Verified tier (P1 provenance) — invoice photos

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

-- widen the §5b column-level read grant so the apps can read the badge and the
-- dashboard can list the verification queue. device/ip_hash stay private to anon.
grant select (id, category, area, price, note, verified, invoice_path, created_at)
  on public.submissions to anon;

notify pgrst, 'reload schema';
```

Until this SQL has run, the apps still work: the `verified` select falls back to the
legacy column list (§5b's column grants make the wide select 400 until the grant above
runs — same graceful path), and a failed photo upload posts the price without the photo
(with a quiet toast) — the flow never blocks on the photo.

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
