-- =====================================================================
-- EDX DECALS - 0002_security.sql : Row Level Security + Storage
-- Public visitors can only READ the catalogue. Every write by a visitor
-- (orders, custom requests, messages) goes through the Next.js server
-- with the service role, after validation. Admins are rows in public.admins.
-- =====================================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;
alter table public.settings        enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.custom_orders   enable row level security;
alter table public.messages        enable row level security;
alter table public.payments        enable row level security;
alter table public.payment_events  enable row level security;
alter table public.admins          enable row level security;

-- Catalogue: public read, admin write
drop policy if exists "categories read" on public.categories;
create policy "categories read" on public.categories for select to anon, authenticated using (true);
drop policy if exists "categories admin" on public.categories;
create policy "categories admin" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products read" on public.products;
create policy "products read" on public.products for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "products admin" on public.products;
create policy "products admin" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "product_images read" on public.product_images;
create policy "product_images read" on public.product_images for select to anon, authenticated using (true);
drop policy if exists "product_images admin" on public.product_images;
create policy "product_images admin" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings for select to anon, authenticated using (true);
drop policy if exists "settings admin" on public.settings;
create policy "settings admin" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Private business data: admin only
drop policy if exists "orders admin" on public.orders;
create policy "orders admin" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "order_items admin" on public.order_items;
create policy "order_items admin" on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "custom_orders admin" on public.custom_orders;
create policy "custom_orders admin" on public.custom_orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "messages admin" on public.messages;
create policy "messages admin" on public.messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "payments admin read" on public.payments;
create policy "payments admin read" on public.payments for select to authenticated using (public.is_admin());
drop policy if exists "payment_events admin read" on public.payment_events;
create policy "payment_events admin read" on public.payment_events for select to authenticated using (public.is_admin());

drop policy if exists "admins read" on public.admins;
create policy "admins read" on public.admins for select to authenticated using (public.is_admin() or user_id = auth.uid());
drop policy if exists "admins manage" on public.admins;
create policy "admins manage" on public.admins for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage ----------
-- products: public images.  custom-orders: private customer references (signed URLs only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('custom-orders', 'custom-orders', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "products bucket read" on storage.objects;
create policy "products bucket read" on storage.objects for select to anon, authenticated using (bucket_id = 'products');
drop policy if exists "products bucket admin write" on storage.objects;
create policy "products bucket admin write" on storage.objects for all to authenticated
  using (bucket_id = 'products' and public.is_admin()) with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "custom bucket admin" on storage.objects;
create policy "custom bucket admin" on storage.objects for all to authenticated
  using (bucket_id = 'custom-orders' and public.is_admin()) with check (bucket_id = 'custom-orders' and public.is_admin());
