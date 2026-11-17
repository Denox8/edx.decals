-- =====================================================================
-- EDX DECALS - seed.sql : settings row + the PHP app's starter catalogue.
-- Safe to run more than once. Skip the product part if you import your
-- real data with scripts/migrate-from-sqlite.mjs.
-- =====================================================================
insert into public.settings (id, site_palette, sale_mode, sale_discount, sale_scope)
values (1, 'cyber', false, 0, 'all') on conflict (id) do nothing;

insert into public.categories (name) values ('Anime'), ('Cars'), ('Logos') on conflict (name) do nothing;

insert into public.products (sort_order, name, price, category, description, cover_image, colors, textures)
select * from (values
  (1, 'Neo Rider Vinyl', 4.99, 'Anime', 'A high-contrast anime-inspired rider decal for laptops, tumblers, and notebooks.', '/images/sticker-anime.svg'),
  (2, 'Street Rig Side Cut', 7.50, 'Cars', 'A bold contour-cut automotive graphic built for toolboxes, helmets, and car glass.', '/images/sticker-cars.svg'),
  (3, 'Verified Logo Pack', 5.25, 'Logos', 'Minimal brand-ready logo stickers designed for packaging, shipping boxes, and storefront counters.', '/images/sticker-logos.svg'),
  (4, 'Garage Night Mark', 6.80, 'Cars', 'Retro night-drive inspired vinyl with durable outdoor lamination.', '/images/sticker-cars.svg'),
  (5, 'Mascot Burst Sheet', 8.20, 'Anime', 'A playful character sheet for clubs, creator merch, and collector drops.', '/images/sticker-anime.svg'),
  (6, 'Monogram Seal Set', 3.99, 'Logos', 'Clean monogram decals for envelopes, premium boxes, and event kits.', '/images/sticker-logos.svg')
) as v(sort_order, name, price, category, description, cover_image)
cross join lateral (select
  '[{"value":"white","label":"White","hex":"#F4F4F4"},{"value":"black","label":"Black","hex":"#111111"},{"value":"yellow","label":"Yellow","hex":"#FFC72E"},{"value":"blue","label":"Blue","hex":"#3EA2FF"}]'::jsonb as colors,
  '[{"value":"glossy","label":"Glossy"},{"value":"matte","label":"Matte"}]'::jsonb as textures) d
where not exists (select 1 from public.products);

insert into public.product_images (product_id, path, sort_order)
select p.id, p.cover_image, 0 from public.products p
where p.cover_image is not null and not exists (select 1 from public.product_images i where i.product_id = p.id);
insert into public.product_images (product_id, path, sort_order)
select p.id, '/images/sticker-default.svg', 1 from public.products p
where (select count(*) from public.product_images i where i.product_id = p.id) = 1;
