-- ================================================================
-- MAXIMS INTERIORS & HOME GOODS — SUPABASE SCHEMA
-- Paste the entire file into Supabase SQL Editor and Run
-- ================================================================

-- ── EXTENSIONS ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy search on products

-- ── ENUMS ───────────────────────────────────────────────────────
create type user_role as enum (
  'owner',            -- Maxim — full access, can invite team, manage settings
  'senior_designer',  -- Manage projects, gallery, testimonials, appointments
  'project_manager',  -- Manage appointments, bulk requests, contact messages
  'shop_manager',     -- Manage products and orders only
  'content_editor'    -- Gallery, testimonials, team member bios only
);

create type product_status    as enum ('active','draft','archived','out_of_stock');
create type order_status      as enum ('pending','processing','shipped','delivered','cancelled','refunded');
create type bulk_status       as enum ('new','reviewing','quoted','accepted','declined','completed');
create type appt_status       as enum ('pending','confirmed','completed','cancelled','rescheduled');
create type appt_type         as enum ('design_consultation','virtual_design','showroom_visit','project_review','bulk_inquiry');
create type contact_status    as enum ('unread','read','replied','archived');

-- ================================================================
-- PROFILES (linked to Supabase Auth)
-- ================================================================
create table profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  email        text unique not null,
  full_name    text not null,
  role         user_role not null default 'content_editor',
  avatar_url   text,
  title        text,
  phone        text,
  is_active    boolean default true,
  last_seen    timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Auto-create profile row when a user signs up via Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'content_editor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ================================================================
-- PRODUCTS
-- ================================================================
create table products (
  id              uuid default uuid_generate_v4() primary key,
  name            text not null,
  slug            text unique not null,
  description     text,
  price           numeric(12,2) not null,
  compare_price   numeric(12,2),
  category        text not null,
  badge           text,
  images          text[] default '{}',
  cover_image     text,
  stock_qty       integer default 0,
  sku             text unique,
  status          product_status default 'active',
  is_featured     boolean default false,
  sort_order      integer default 0,
  weight_kg       numeric(5,2),
  dimensions      text,
  tags            text[] default '{}',
  created_by      uuid references profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ================================================================
-- ORDERS
-- ================================================================
create sequence order_seq start 1001;

create table orders (
  id               uuid default uuid_generate_v4() primary key,
  order_number     text unique not null default 'MX-' || nextval('order_seq'),
  customer_name    text not null,
  customer_email   text not null,
  customer_phone   text,
  delivery_address text,
  city             text,
  state            text,
  items            jsonb not null default '[]',
  subtotal         numeric(12,2) not null default 0,
  delivery_fee     numeric(12,2) default 0,
  total            numeric(12,2) not null default 0,
  status           order_status default 'pending',
  payment_method   text,
  payment_ref      text,
  payment_status   text default 'unpaid',
  notes            text,
  assigned_to      uuid references profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ================================================================
-- BULK ORDER REQUESTS
-- ================================================================
create table bulk_requests (
  id               uuid default uuid_generate_v4() primary key,
  company_name     text not null,
  contact_name     text not null,
  email            text not null,
  phone            text,
  project_type     text,
  product_category text,
  quantity         text,
  budget_range     text,
  message          text,
  status           bulk_status default 'new',
  quote_amount     numeric(12,2),
  quote_notes      text,
  assigned_to      uuid references profiles(id),
  internal_notes   text,
  followed_up_at   timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ================================================================
-- APPOINTMENTS / CONSULTATIONS
-- ================================================================
create table appointments (
  id               uuid default uuid_generate_v4() primary key,
  client_name      text not null,
  client_email     text not null,
  client_phone     text,
  type             appt_type default 'design_consultation',
  service          text,
  preferred_date   date not null,
  preferred_time   time not null,
  duration_mins    integer default 60,
  status           appt_status default 'pending',
  location         text default 'showroom',
  meeting_link     text,
  notes            text,
  internal_notes   text,
  assigned_to      uuid references profiles(id),
  confirmed_at     timestamptz,
  reminded_at      timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ================================================================
-- CONTACT MESSAGES
-- ================================================================
create table contact_messages (
  id               uuid default uuid_generate_v4() primary key,
  full_name        text not null,
  email            text not null,
  phone            text,
  service          text,
  message          text not null,
  status           contact_status default 'unread',
  replied_by       uuid references profiles(id),
  reply_text       text,
  replied_at       timestamptz,
  created_at       timestamptz default now()
);

-- ================================================================
-- GALLERY / PORTFOLIO PROJECTS
-- ================================================================
create table gallery_projects (
  id               uuid default uuid_generate_v4() primary key,
  title            text not null,
  slug             text unique not null,
  category         text not null,
  location         text,
  year             integer,
  grid_size        text default 'small' check (grid_size in ('small','medium','large')),
  description      text,
  images           text[] default '{}',
  cover_image      text,
  is_featured      boolean default false,
  is_published     boolean default true,
  sort_order       integer default 0,
  sqft             text,
  duration         text,
  client_name      text,
  testimonial_id   uuid references testimonials(id),
  created_by       uuid references profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Note: testimonials table referenced above — define it first
create table testimonials (
  id               uuid default uuid_generate_v4() primary key,
  client_name      text not null,
  client_role      text,
  quote            text not null,
  rating           integer default 5 check (rating between 1 and 5),
  project_type     text,
  avatar_url       text,
  is_featured      boolean default false,
  is_published     boolean default true,
  sort_order       integer default 0,
  project_id       uuid,
  created_by       uuid references profiles(id),
  created_at       timestamptz default now()
);

-- Fix the forward reference (re-run if needed)
alter table gallery_projects
  drop column if exists testimonial_id;
alter table gallery_projects
  add column testimonial_id uuid references testimonials(id);

-- ================================================================
-- TEAM MEMBERS (public-facing profiles)
-- ================================================================
create table team_members (
  id               uuid default uuid_generate_v4() primary key,
  full_name        text not null,
  title            text not null,
  bio              text,
  photo_url        text,
  instagram        text,
  linkedin         text,
  sort_order       integer default 0,
  is_published     boolean default true,
  profile_id       uuid references profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ================================================================
-- SITE SETTINGS (key-value store)
-- ================================================================
create table site_settings (
  key              text primary key,
  value            jsonb not null,
  description      text,
  updated_by       uuid references profiles(id),
  updated_at       timestamptz default now()
);

insert into site_settings (key, value, description) values
  ('contact_info', '{"phone":"+234 800 000 0000","email":"hello@maximsinteriors.com","address":"123 Design Boulevard, Wuse 2, Abuja, FCT","hours":"Mon–Sat: 9am–7pm WAT"}', 'Contact details'),
  ('social_links', '{"instagram":"","facebook":"","linkedin":"","youtube":"","pinterest":""}', 'Social media URLs'),
  ('hero_content', '{"headline":"Where Luxury Meets Living","subtext":"Transforming spaces into timeless experiences","cta_primary":"Explore Our Work","cta_secondary":"Book Consultation"}', 'Homepage hero'),
  ('business_hours', '{"monday":"09:00-19:00","tuesday":"09:00-19:00","wednesday":"09:00-19:00","thursday":"09:00-19:00","friday":"09:00-19:00","saturday":"09:00-17:00","sunday":"closed"}', 'Booking availability'),
  ('notification_emails', '"hello@maximsinteriors.com"', 'New enquiry notification recipient'),
  ('delivery_fee', '5000', 'Default delivery fee in Naira'),
  ('maintenance_mode', 'false', 'Set true to show maintenance page');

-- ================================================================
-- ACTIVITY LOG (audit trail)
-- ================================================================
create table activity_log (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references profiles(id),
  action           text not null,
  resource_type    text not null,
  resource_id      uuid,
  description      text,
  old_value        jsonb,
  new_value        jsonb,
  ip_address       text,
  created_at       timestamptz default now()
);

-- ================================================================
-- UPDATED_AT TRIGGERS
-- ================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_upd    before update on profiles         for each row execute procedure set_updated_at();
create trigger trg_products_upd    before update on products          for each row execute procedure set_updated_at();
create trigger trg_orders_upd      before update on orders            for each row execute procedure set_updated_at();
create trigger trg_bulk_upd        before update on bulk_requests     for each row execute procedure set_updated_at();
create trigger trg_appts_upd       before update on appointments      for each row execute procedure set_updated_at();
create trigger trg_gallery_upd     before update on gallery_projects  for each row execute procedure set_updated_at();
create trigger trg_team_upd        before update on team_members      for each row execute procedure set_updated_at();

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
alter table profiles          enable row level security;
alter table products          enable row level security;
alter table orders            enable row level security;
alter table bulk_requests     enable row level security;
alter table appointments      enable row level security;
alter table contact_messages  enable row level security;
alter table gallery_projects  enable row level security;
alter table testimonials      enable row level security;
alter table team_members      enable row level security;
alter table site_settings     enable row level security;
alter table activity_log      enable row level security;

-- Helper functions
create or replace function my_role()
returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active = true);
$$;

-- ── PROFILES ──
create policy "Own profile readable"      on profiles for select using (auth.uid() = id);
create policy "Owner reads all profiles"  on profiles for select using (my_role() = 'owner');
create policy "Owner manages profiles"    on profiles for all    using (my_role() = 'owner');
create policy "Self update"               on profiles for update using (auth.uid() = id);

-- ── PRODUCTS ──
create policy "Public reads active"       on products for select using (status = 'active');
create policy "Staff reads all"           on products for select using (is_staff());
create policy "Shop+ manages products"    on products for all    using (my_role() in ('owner','shop_manager','senior_designer'));

-- ── ORDERS ──
create policy "Anyone can place order"    on orders for insert with check (true);
create policy "Staff reads orders"        on orders for select using (is_staff());
create policy "Shop+ manages orders"      on orders for update using (my_role() in ('owner','shop_manager','project_manager'));
create policy "Owner deletes orders"      on orders for delete using (my_role() = 'owner');

-- ── BULK REQUESTS ──
create policy "Anyone submits bulk"       on bulk_requests for insert with check (true);
create policy "Staff reads bulk"          on bulk_requests for select using (is_staff());
create policy "PM+ manages bulk"          on bulk_requests for update using (my_role() in ('owner','project_manager','senior_designer'));

-- ── APPOINTMENTS ──
create policy "Anyone books appt"         on appointments for insert with check (true);
create policy "Staff reads appts"         on appointments for select using (is_staff());
create policy "PM+ manages appts"         on appointments for update using (my_role() in ('owner','project_manager','senior_designer'));

-- ── CONTACT MESSAGES ──
create policy "Anyone sends message"      on contact_messages for insert with check (true);
create policy "Staff reads messages"      on contact_messages for select using (is_staff());
create policy "PM+ manages messages"      on contact_messages for update using (my_role() in ('owner','project_manager'));

-- ── GALLERY ──
create policy "Public reads published gallery"   on gallery_projects for select using (is_published = true);
create policy "Staff reads all gallery"          on gallery_projects for select using (is_staff());
create policy "Content+ manages gallery"         on gallery_projects for all    using (my_role() in ('owner','content_editor','senior_designer'));

-- ── TESTIMONIALS ──
create policy "Public reads published testis"    on testimonials for select using (is_published = true);
create policy "Staff reads all testis"           on testimonials for select using (is_staff());
create policy "Content+ manages testis"          on testimonials for all    using (my_role() in ('owner','content_editor','senior_designer'));

-- ── TEAM ──
create policy "Public reads published team"      on team_members for select using (is_published = true);
create policy "Staff reads all team"             on team_members for select using (is_staff());
create policy "Owner manages team"               on team_members for all    using (my_role() in ('owner','senior_designer'));

-- ── SETTINGS ──
create policy "Staff reads settings"             on site_settings for select using (is_staff());
create policy "Owner manages settings"           on site_settings for all    using (my_role() = 'owner');

-- ── ACTIVITY LOG ──
create policy "Staff reads activity"             on activity_log for select using (is_staff());
create policy "System inserts activity"          on activity_log for insert with check (is_staff());

-- ================================================================
-- STORAGE BUCKETS (run via Supabase dashboard OR via this SQL)
-- ================================================================
-- In Supabase Dashboard → Storage → New Bucket, create:
--   1. "products"     — public: true
--   2. "gallery"      — public: true
--   3. "team"         — public: true
--   4. "testimonials" — public: true
--   5. "avatars"      — public: false (private team avatars)
--
-- Storage RLS: staff can upload, public can read public buckets

-- ================================================================
-- SEED DATA (remove before production)
-- ================================================================
-- Products sample
insert into products (name, slug, description, price, category, badge, stock_qty, is_featured, status) values
  ('Elara Accent Chair', 'elara-accent-chair', 'Handcrafted velvet accent chair in deep jewel tones', 185000, 'Living Room', 'New Arrival', 12, true, 'active'),
  ('Aurum Candle Collection', 'aurum-candle-collection', 'Set of 3 luxury hand-poured soy candles', 24500, 'Décor', 'Staff Pick', 45, true, 'active'),
  ('Abstrakt Canvas Triptych', 'abstrakt-canvas-triptych', 'Three-panel abstract art print on premium canvas', 92000, 'Wall Art', null, 8, false, 'active'),
  ('Onyx Marble Planter Trio', 'onyx-marble-planter-trio', 'Set of 3 marble-finish ceramic planters', 41000, 'Greenery', 'Sale', 22, true, 'active'),
  ('Vela Pendant Light', 'vela-pendant-light', 'Brushed brass pendant light with frosted globe', 68000, 'Lighting', null, 6, false, 'active'),
  ('Lagos Woven Area Rug', 'lagos-woven-area-rug', 'Handwoven area rug in warm earth tones', 127000, 'Rugs', 'New Arrival', 9, false, 'active');

-- Gallery sample
insert into gallery_projects (title, slug, category, location, year, grid_size, is_featured, is_published) values
  ('The Laurent Residence', 'laurent-residence', 'Living Room', 'Maitama, Abuja', 2024, 'large', true, true),
  ('Okonkwo Master Suite', 'okonkwo-suite', 'Bedroom', 'Lekki, Lagos', 2024, 'small', false, true),
  ('Casa Elegante Dining', 'casa-elegante', 'Living Room', 'Victoria Island', 2023, 'small', false, true),
  ('Meridian Hotel Lobby', 'meridian-hotel', 'Commercial', 'CBD, Abuja', 2023, 'medium', true, true),
  ('The Pinnacle Penthouse', 'pinnacle-penthouse', 'Living Room', 'Ikoyi, Lagos', 2022, 'large', true, true);

-- Testimonials sample
insert into testimonials (client_name, client_role, quote, rating, project_type, is_featured, is_published) values
  ('Adaeze Nwosu', 'Homeowner · Lekki Phase 1', 'Working with Maxims was extraordinary. They transformed our home into a palace of refined elegance.', 5, 'Full Home Design', true, true),
  ('Chief Emmanuel Okafor', 'Hotel Owner · Meridian Abuja', 'Their design sensibility is unmatched in Nigeria. Occupancy is up 40% after the redesign.', 5, 'Commercial Design', true, true),
  ('Dr. Ngozi Adeyemi', 'Homeowner · Asokoro', 'From consultation to reveal, Maxims exceeded every expectation. Cannot be replicated elsewhere.', 5, 'Living Room & Master Suite', true, true);
