-- 在 Supabase：SQL Editor → New query → 粘贴运行一次即可

create table if not exists public.love_entries (
  id text primary key,
  publisher text not null,
  receiver text not null,
  body text,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.love_entries enable row level security;

-- 匿名 key 可读写（密钥在网页里，仅适合私密链接、非高敏场景）
drop policy if exists "love_select" on public.love_entries;
create policy "love_select" on public.love_entries for select using (true);

drop policy if exists "love_insert" on public.love_entries;
create policy "love_insert" on public.love_entries for insert with check (true);

create table if not exists public.love_travel_cities (
  id text primary key,
  city_name text not null,
  travel_date date,
  lat double precision not null,
  lng double precision not null,
  publisher text not null,
  created_at timestamptz not null default now()
);

alter table public.love_travel_cities enable row level security;

drop policy if exists "travel_select" on public.love_travel_cities;
create policy "travel_select" on public.love_travel_cities for select using (true);

drop policy if exists "travel_insert" on public.love_travel_cities;
create policy "travel_insert" on public.love_travel_cities for insert with check (true);
