-- =====================================================================
-- EDX DECALS - 0001_schema.sql  (Supabase / PostgreSQL)
-- Port of the PHP app's SQLite schema + the new payment layer.
-- Run in Supabase: SQL Editor > New query > paste > Run (then 0002, then seed.sql).
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- catalogue ----------
create table if not exists public.categories (
  id          bigserial primary key,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id             bigserial primary key,
  sort_order     integer not null default 0,
  name           text not null,
  price          numeric(10,2) not null check (price > 0),
  category       text not null,
  description    text not null,
  cover_image    text,
  -- [{ "value": "black", "label": "Black", "hex": "#111111", "image": "products/x.png" }]
  colors         jsonb not null default '[]'::jsonb,
  -- [{ "value": "glossy", "label": "Glossy" }]
  textures       jsonb not null default '[]'::jsonb,
  sale_selected  boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists products_sort_idx on public.products (sort_order, id desc);
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table if not exists public.product_images (
  id          bigserial primary key,
  product_id  bigint not null references public.products(id) on delete cascade,
  path        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------- settings (single row) ----------
create table if not exists public.settings (
  id             integer primary key default 1 check (id = 1),
  site_palette   text not null default 'cyber' check (site_palette in ('cyber','blue','noel','araw','festival')),
  sale_mode      boolean not null default false,
  sale_discount  integer not null default 0 check (sale_discount between 0 and 100),
  sale_scope     text not null default 'all' check (sale_scope in ('all','selected')),
  updated_at     timestamptz not null default now()
);
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- ---------- orders ----------
create table if not exists public.orders (
  id                   bigserial primary key,
  order_ticket         text unique,
  customer_name        text not null,
  email                text not null,
  phone                text not null default '',
  address              text not null,
  -- fulfillment (same values as the PHP app)
  status               text not null default 'received'
                       check (status in ('received','processing','printing','ready','shipped','completed','cancelled')),
  status_notes         text,
  -- payment (new). offline = paid by cash/bank transfer, confirmed by admin
  payment_status       text not null default 'pending'
                       check (payment_status in ('pending','paid','failed','expired','refunded','offline')),
  subtotal_price       numeric(10,2) not null default 0,
  discount_amount      numeric(10,2) not null default 0,
  discount_percentage  integer not null default 0,
  total_price          numeric(10,2) not null default 0,
  paid_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_payment_idx on public.orders (payment_status);

create or replace function public.set_order_ticket() returns trigger
language plpgsql as $$
begin
  if new.order_ticket is null or btrim(new.order_ticket) = '' then
    new.order_ticket := 'ORD-' || lpad(new.id::text, 6, '0');
  end if;
  return new;
end $$;
drop trigger if exists orders_ticket on public.orders;
create trigger orders_ticket before insert on public.orders for each row execute function public.set_order_ticket();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table if not exists public.order_items (
  id                   bigserial primary key,
  order_id             bigint not null references public.orders(id) on delete cascade,
  product_id           bigint references public.products(id) on delete set null,
  product_name         text not null,
  product_image        text,
  sticker_color        text not null default 'white',
  color_label          text not null default 'White',
  sticker_texture      text not null default 'glossy',
  texture_label        text not null default 'Glossy',
  unit_price           numeric(10,2) not null default 0,
  final_unit_price     numeric(10,2) not null default 0,
  discount_percentage  integer not null default 0,
  quantity             integer not null default 1 check (quantity > 0)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------- custom orders ----------
create table if not exists public.custom_orders (
  id                 bigserial primary key,
  customer_name      text not null default '',
  email              text not null default '',
  phone              text not null default '',
  social_handle      text not null default '',
  preferred_contact  text not null default 'email' check (preferred_contact in ('email','phone','social','any')),
  description        text not null,
  image_path         text,
  size               text not null,
  status             text not null default 'new'
                     check (status in ('new','contacted','quoted','approved','in_progress','completed','cancelled')),
  admin_notes        text,
  quoted_price       numeric(10,2) check (quoted_price is null or quoted_price >= 0),
  is_featured        boolean not null default false,
  pay_token          uuid not null default gen_random_uuid() unique,
  payment_status     text not null default 'unpaid'
                     check (payment_status in ('unpaid','pending','paid','failed','expired','refunded','offline')),
  paid_at            timestamptz,
  contacted_at       timestamptz,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint featured_only_completed check (is_featured = false or status = 'completed')
);
drop trigger if exists custom_orders_touch on public.custom_orders;
create trigger custom_orders_touch before update on public.custom_orders for each row execute function public.touch_updated_at();

-- ---------- messages ----------
create table if not exists public.messages (
  id           bigserial primary key,
  name         text not null,
  email        text not null,
  message      text not null,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------- payments (new) ----------
create table if not exists public.payments (
  id                    bigserial primary key,
  order_id              bigint references public.orders(id) on delete cascade,
  custom_order_id       bigint references public.custom_orders(id) on delete cascade,
  provider              text not null default 'paymongo',
  provider_checkout_id  text unique,
  provider_payment_id   text,
  amount                numeric(10,2) not null,
  currency              text not null default 'PHP',
  payment_method        text,
  status                text not null default 'pending'
                        check (status in ('pending','paid','failed','expired','refunded')),
  paid_at               timestamptz,
  raw_event             jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint payment_target check (order_id is not null or custom_order_id is not null)
);
drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- Idempotency: every webhook event id is stored once.
create table if not exists public.payment_events (
  id           text primary key,
  type         text not null,
  received_at  timestamptz not null default now()
);

-- ---------- admins (replaces admin_users + password hashes) ----------
create table if not exists public.admins (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  created_at    timestamptz not null default now()
);

-- ---------- transactional checkout (called by the server with the service role only) ----------
create or replace function public.place_order(p_order jsonb, p_items jsonb)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_item  jsonb;
begin
  insert into public.orders (customer_name, email, phone, address, subtotal_price, discount_amount, discount_percentage, total_price)
  values (p_order->>'customer_name', p_order->>'email', coalesce(p_order->>'phone',''), p_order->>'address',
          (p_order->>'subtotal_price')::numeric, (p_order->>'discount_amount')::numeric,
          (p_order->>'discount_percentage')::int, (p_order->>'total_price')::numeric)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, product_id, product_name, product_image, sticker_color, color_label,
                                    sticker_texture, texture_label, unit_price, final_unit_price, discount_percentage, quantity)
    values (v_order.id, (v_item->>'product_id')::bigint, v_item->>'product_name', v_item->>'product_image',
            v_item->>'sticker_color', v_item->>'color_label', v_item->>'sticker_texture', v_item->>'texture_label',
            (v_item->>'unit_price')::numeric, (v_item->>'final_unit_price')::numeric,
            (v_item->>'discount_percentage')::int, (v_item->>'quantity')::int);
  end loop;

  return v_order;
end $$;
revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb) to service_role;
