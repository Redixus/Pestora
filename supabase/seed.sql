insert into public.brands (slug, name, accent_color, partner_host, active)
values
  ('pestora', 'Pestora', '#16A34A', 'pro.pestora.be', true),
  ('drenora', 'Drenora', '#0284C7', 'pro.drenora.be', true),
  ('movira', 'Movira', '#EA580C', 'pro.movira.be', true)
on conflict (slug) do update set
  name = excluded.name,
  accent_color = excluded.accent_color,
  partner_host = excluded.partner_host,
  active = excluded.active;

insert into public.services (
  brand_id, slug, name_fr, name_nl, default_price_cents, active, sort_order
)
select b.id, v.slug, v.name_fr, v.name_nl, v.default_price_cents, true, v.sort_order
from public.brands b
join (
  values
    ('pestora', 'rats_mice', 'Rats / souris', 'Ratten en muizen', 2500, 1),
    ('pestora', 'cockroaches', 'Cafards', 'Kakkerlakken', 2500, 2),
    ('pestora', 'bed_bugs', 'Punaises de lit', 'Bedwantsen', 3500, 3),
    ('pestora', 'wasps', 'Guêpes', 'Wespen', 2000, 4),
    ('pestora', 'other_pest', 'Autre nuisible', 'Ander ongedierte', 2500, 5),
    ('drenora', 'unblocking', 'Débouchage', 'Ontstopping', 3000, 1),
    ('drenora', 'sewers', 'Égouts', 'Riolering', 3000, 2),
    ('drenora', 'hydrojetting', 'Hydrocurage', 'Hogedrukreiniging riolering', 4000, 3),
    ('drenora', 'camera_inspection', 'Inspection caméra', 'Camera-inspectie', 3000, 4),
    ('drenora', 'leak_detection', 'Recherche de fuite', 'Lekdetectie', 3500, 5),
    ('drenora', 'pumps', 'Pompes', 'Pompen', 3000, 6),
    ('movira', 'moving', 'Déménagement', 'Verhuizing', 4000, 1),
    ('movira', 'small_moving', 'Petit déménagement', 'Kleine verhuizing', 2500, 2),
    ('movira', 'clearance', 'Débarras', 'Ontruiming', 3000, 3),
    ('movira', 'furniture_transport', 'Transport de mobilier', 'Meubeltransport', 2000, 4)
) as v(brand_slug, slug, name_fr, name_nl, default_price_cents, sort_order)
  on b.slug = v.brand_slug
on conflict (brand_id, slug) do update set
  name_fr = excluded.name_fr,
  name_nl = excluded.name_nl,
  default_price_cents = excluded.default_price_cents,
  active = excluded.active,
  sort_order = excluded.sort_order;
