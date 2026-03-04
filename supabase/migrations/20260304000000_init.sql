-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  email text,
  avatar_url text,
  role text default 'content_editor'::text,
  is_active boolean default true,
  last_seen timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PRODUCTS
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price numeric not null,
  stock_qty integer default 0,
  category text,
  is_featured boolean default false,
  status text default 'active',
  sort_order integer default 0,
  images text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ORDERS
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  delivery_address text,
  city text,
  state text,
  subtotal numeric not null,
  delivery_fee numeric,
  total numeric not null,
  payment_status text default 'pending',
  status text default 'pending',
  notes text,
  items jsonb,
  assigned_to uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. BULK REQUESTS
create table public.bulk_requests (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  company text,
  phone text,
  details text,
  status text default 'new',
  internal_notes text,
  assigned_to uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. APPOINTMENTS
create table public.appointments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  type text not null,
  preferred_date date not null,
  preferred_time time not null,
  details text,
  status text default 'pending',
  confirmed_at timestamp with time zone,
  assigned_to uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. CONTACT MESSAGES
create table public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text default 'unread',
  reply_text text,
  replied_by uuid references public.profiles(id),
  replied_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. GALLERY PROJECTS
create table public.gallery_projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text,
  is_featured boolean default false,
  is_published boolean default true,
  sort_order integer default 0,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. TESTIMONIALS
create table public.testimonials (
  id uuid default gen_random_uuid() primary key,
  client_name text not null,
  client_role text,
  content text not null,
  is_featured boolean default false,
  is_published boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. TEAM MEMBERS
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  bio text,
  is_published boolean default true,
  sort_order integer default 0,
  image_url text,
  email text,
  linkedin_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. SITE SETTINGS
create table public.site_settings (
  key text primary key,
  value text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. ACTIVITY LOG
create table public.activity_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  resource_type text,
  resource_id text,
  description text,
  old_value text,
  new_value text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Storage Buckets
insert into storage.buckets (id, name, public) values 
  ('products', 'products', true),
  ('gallery', 'gallery', true),
  ('team', 'team', true),
  ('testimonials', 'testimonials', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public Access" on storage.objects for select using ( bucket_id in ('products', 'gallery', 'team', 'testimonials', 'avatars') );
create policy "Authenticated uploads" on storage.objects for insert with check ( auth.role() = 'authenticated' );
create policy "Authenticated updates" on storage.objects for update using ( auth.role() = 'authenticated' );
create policy "Authenticated deletes" on storage.objects for delete using ( auth.role() = 'authenticated' );

-- Default data for site settings
insert into public.site_settings (key, value) values
  ('contact_info', '{"phone":"+234 800 000 0000","email":"hello@maximsinteriors.com","address":"123 Design Blvd, Wuse 2, Abuja","hours":"Mon–Sat: 9am–7pm WAT"}'),
  ('social_links', '{"instagram":"https://instagram.com/maximsinteriors","facebook":"https://facebook.com/maximsinteriors","linkedin":"","youtube":"","pinterest":""}')
on conflict (key) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.bulk_requests enable row level security;
alter table public.appointments enable row level security;
alter table public.contact_messages enable row level security;
alter table public.gallery_projects enable row level security;
alter table public.testimonials enable row level security;
alter table public.team_members enable row level security;
alter table public.site_settings enable row level security;
alter table public.activity_log enable row level security;

-- Public read access
create policy "Public profiles read" on public.profiles for select using (true);
create policy "Public products read" on public.products for select using (true);
create policy "Public gallery read" on public.gallery_projects for select using (true);
create policy "Public appt read" on public.appointments for select using (true);
create policy "Public tm read" on public.testimonials for select using (true);
create policy "Public team read" on public.team_members for select using (true);
create policy "Public settings read" on public.site_settings for select using (true);

-- Public insert (for forms)
create policy "Public contact insert" on public.contact_messages for insert with check (true);
create policy "Public bulk requests insert" on public.bulk_requests for insert with check (true);
create policy "Public appointments insert" on public.appointments for insert with check (true);
create policy "Public orders insert" on public.orders for insert with check (true);

-- Admin full access (authenticated users)
create policy "Admin profiles all" on public.profiles for all using (auth.role() = 'authenticated');
create policy "Admin products all" on public.products for all using (auth.role() = 'authenticated');
create policy "Admin orders all" on public.orders for all using (auth.role() = 'authenticated');
create policy "Admin bulk_requests all" on public.bulk_requests for all using (auth.role() = 'authenticated');
create policy "Admin appointments all" on public.appointments for all using (auth.role() = 'authenticated');
create policy "Admin contact_messages all" on public.contact_messages for all using (auth.role() = 'authenticated');
create policy "Admin gallery all" on public.gallery_projects for all using (auth.role() = 'authenticated');
create policy "Admin testimonials all" on public.testimonials for all using (auth.role() = 'authenticated');
create policy "Admin team all" on public.team_members for all using (auth.role() = 'authenticated');
create policy "Admin settings all" on public.site_settings for all using (auth.role() = 'authenticated');
create policy "Admin log all" on public.activity_log for all using (auth.role() = 'authenticated');

-- Auth trigger to create profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url', coalesce(new.raw_user_meta_data->>'role', 'content_editor'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Webhooks for Edge Functions (Wait, the user wants emails via Resend triggered by edge functions)
-- We need to create triggers that call our Edge Functions.

-- Note: Edge function URLs are deployed automatically by Supabase CLI, but calling them from pg_net requires setup.
-- We can set up the webhooks via the Supabase Dashboard, or natively via SQL.

create extension if not exists "pg_net";

-- Since we don't know the exact project URL inside the trigger dynamically easily without config,
-- we'll rely on the standard Supabase webhooks (which are just triggers using pg_net).
-- We can script it but it's simpler to use trigger functions if we hardcode the URL, but the URL is jwouyiqkvwxxucvctzwi
-- To be safe, the user can manually hook them up or we can provide the SQL.
