create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  accent_color text not null,
  partner_host text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'partner')),
  email text not null,
  created_at timestamptz not null default now()
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  vat_number text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table public.partner_brand_memberships (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (partner_id, brand_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  slug text not null,
  name_fr text not null,
  name_nl text not null,
  default_price_cents integer not null check (default_price_cents >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  unique (brand_id, slug)
);

create table public.partner_services (
  partner_id uuid not null references public.partners(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (partner_id, service_id)
);

create table public.partner_postcodes (
  partner_id uuid not null references public.partners(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  postal_code text not null check (postal_code ~ '^[0-9]{4}$'),
  primary key (partner_id, brand_id, postal_code)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  service_id uuid not null references public.services(id),
  postal_code text not null check (postal_code ~ '^[0-9]{4}$'),
  city text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  status text not null default 'available'
    check (status in ('available', 'sold', 'invalid', 'archived')),
  photo_count integer not null default 0 check (photo_count >= 0),
  extra_data jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now()
);

create index leads_brand_status_created_at_idx
  on public.leads (brand_id, status, created_at desc);
create index leads_postal_code_idx on public.leads (postal_code);

create table public.lead_contacts (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  full_address text,
  consent_at timestamptz not null,
  privacy_version text not null
);

create table public.lead_photos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index lead_photos_lead_id_idx on public.lead_photos (lead_id);

create table public.partner_wallets (
  partner_id uuid primary key references public.partners(id) on delete cascade,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.create_partner_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.partner_wallets (partner_id, balance_cents)
  values (new.id, 0)
  on conflict (partner_id) do nothing;
  return new;
end;
$$;

create trigger partner_wallet_on_insert
  after insert on public.partners
  for each row execute function public.create_partner_wallet();

create table public.lead_purchases (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id),
  partner_id uuid not null references public.partners(id),
  price_paid_cents integer not null check (price_paid_cents >= 0),
  purchased_at timestamptz not null default now(),
  refunded_at timestamptz,
  refund_reason text
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  type text not null check (
    type in ('top_up', 'lead_purchase', 'lead_refund', 'manual_adjustment', 'cash_refund')
  ),
  amount_cents integer not null,
  balance_after_cents integer not null,
  lead_id uuid references public.leads(id),
  purchase_id uuid references public.lead_purchases(id),
  reason text,
  stripe_event_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (type <> 'manual_adjustment' or reason is not null),
  check (stripe_event_id is null or type = 'top_up')
);

create unique index wallet_transactions_stripe_event_id_idx
  on public.wallet_transactions (stripe_event_id)
  where stripe_event_id is not null;
create index wallet_transactions_partner_created_at_idx
  on public.wallet_transactions (partner_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, email)
  values (new.id, 'partner', coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.update_lead_photo_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.leads
    set photo_count = (select count(*) from public.lead_photos where lead_id = old.lead_id)
    where id = old.lead_id;
    return old;
  end if;

  update public.leads
  set photo_count = (select count(*) from public.lead_photos where lead_id = new.lead_id)
  where id = new.lead_id;

  if tg_op = 'UPDATE' and old.lead_id <> new.lead_id then
    update public.leads
    set photo_count = (select count(*) from public.lead_photos where lead_id = old.lead_id)
    where id = old.lead_id;
  end if;
  return new;
end;
$$;

create trigger lead_photos_photo_count
  after insert or update or delete on public.lead_photos
  for each row execute function public.update_lead_photo_count();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.partners
  where profile_id = auth.uid()
  limit 1;
$$;

create or replace function public.partner_can_see_lead(
  p_partner_id uuid,
  p_lead_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads l
    join public.partners p on p.id = p_partner_id and p.status = 'active'
    join public.partner_brand_memberships bm
      on bm.partner_id = p.id and bm.brand_id = l.brand_id and bm.active
    join public.partner_services ps
      on ps.partner_id = p.id and ps.service_id = l.service_id
    join public.partner_postcodes pp
      on pp.partner_id = p.id
      and pp.brand_id = l.brand_id
      and pp.postal_code = l.postal_code
    join public.brands b
      on b.id = l.brand_id and b.active
    join public.services s
      on s.id = l.service_id and s.brand_id = l.brand_id and s.active
    where l.id = p_lead_id
  );
$$;

-- Purchase errors use stable SQLSTATE/message pairs exposed by supabase-js:
-- P0001 LEAD_NOT_AVAILABLE, P0002 INSUFFICIENT_BALANCE,
-- P0003 NOT_ELIGIBLE, and P0004 PARTNER_SUSPENDED.
create or replace function public.purchase_lead(p_lead_id uuid)
returns public.lead_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner public.partners;
  v_lead public.leads;
  v_wallet public.partner_wallets;
  v_purchase public.lead_purchases;
  v_new_balance integer;
begin
  select p.* into v_partner
  from public.partners p
  where p.profile_id = auth.uid();

  if not found then
    raise exception using errcode = 'P0003', message = 'NOT_ELIGIBLE';
  end if;

  if v_partner.status = 'suspended' then
    raise exception using errcode = 'P0004', message = 'PARTNER_SUSPENDED';
  end if;

  if not exists (select 1 from public.leads where id = p_lead_id) then
    raise exception using errcode = 'P0001', message = 'LEAD_NOT_AVAILABLE';
  end if;

  if not public.partner_can_see_lead(v_partner.id, p_lead_id) then
    raise exception using errcode = 'P0003', message = 'NOT_ELIGIBLE';
  end if;

  select l.* into v_lead
  from public.leads l
  where l.id = p_lead_id
  for update;

  if not found or v_lead.status <> 'available' then
    raise exception using errcode = 'P0001', message = 'LEAD_NOT_AVAILABLE';
  end if;

  select w.* into v_wallet
  from public.partner_wallets w
  where w.partner_id = v_partner.id
  for update;

  if not found or v_wallet.balance_cents < v_lead.price_cents then
    raise exception using errcode = 'P0002', message = 'INSUFFICIENT_BALANCE';
  end if;

  v_new_balance := v_wallet.balance_cents - v_lead.price_cents;

  insert into public.lead_purchases (lead_id, partner_id, price_paid_cents)
  values (v_lead.id, v_partner.id, v_lead.price_cents)
  returning * into v_purchase;

  update public.partner_wallets
  set balance_cents = v_new_balance, updated_at = now()
  where partner_id = v_partner.id;

  insert into public.wallet_transactions (
    partner_id, type, amount_cents, balance_after_cents, lead_id, purchase_id, created_by
  )
  values (
    v_partner.id, 'lead_purchase', -v_lead.price_cents, v_new_balance,
    v_lead.id, v_purchase.id, auth.uid()
  );

  update public.leads set status = 'sold' where id = v_lead.id;
  return v_purchase;
end;
$$;

create or replace function public.refund_purchase(
  p_purchase_id uuid,
  p_reason text
)
returns public.lead_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.lead_purchases;
  v_updated public.lead_purchases;
  v_wallet public.partner_wallets;
  v_new_balance integer;
begin
  if not (public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role') then
    raise exception using errcode = 'A0001', message = 'ADMIN_REQUIRED';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception using errcode = 'A0002', message = 'REASON_REQUIRED';
  end if;

  select p.* into v_purchase
  from public.lead_purchases p
  where p.id = p_purchase_id;
  if not found then
    raise exception using errcode = 'A0003', message = 'PURCHASE_NOT_FOUND';
  end if;

  perform 1 from public.leads where id = v_purchase.lead_id for update;
  select w.* into v_wallet
  from public.partner_wallets w
  where w.partner_id = v_purchase.partner_id
  for update;
  if not found then
    raise exception using errcode = 'A0004', message = 'WALLET_NOT_FOUND';
  end if;

  update public.lead_purchases
  set refunded_at = now(), refund_reason = p_reason
  where id = p_purchase_id and refunded_at is null
  returning * into v_updated;

  if not found then
    return v_purchase;
  end if;

  v_new_balance := v_wallet.balance_cents + v_updated.price_paid_cents;
  update public.partner_wallets
  set balance_cents = v_new_balance, updated_at = now()
  where partner_id = v_updated.partner_id;

  insert into public.wallet_transactions (
    partner_id, type, amount_cents, balance_after_cents, lead_id, purchase_id, reason, created_by
  )
  values (
    v_updated.partner_id, 'lead_refund', v_updated.price_paid_cents, v_new_balance,
    v_updated.lead_id, v_updated.id, p_reason, auth.uid()
  );

  update public.leads set status = 'invalid' where id = v_updated.lead_id;
  return v_updated;
end;
$$;

create or replace function public.admin_adjust_wallet(
  p_partner_id uuid,
  p_amount_cents integer,
  p_reason text
)
returns public.partner_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.partner_wallets;
  v_new_balance integer;
begin
  if not (public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role') then
    raise exception using errcode = 'A0001', message = 'ADMIN_REQUIRED';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception using errcode = 'A0002', message = 'REASON_REQUIRED';
  end if;

  select w.* into v_wallet
  from public.partner_wallets w
  where w.partner_id = p_partner_id
  for update;
  if not found then
    raise exception using errcode = 'A0004', message = 'WALLET_NOT_FOUND';
  end if;

  v_new_balance := v_wallet.balance_cents + p_amount_cents;
  if v_new_balance < 0 then
    raise exception using errcode = 'A0005', message = 'INSUFFICIENT_BALANCE';
  end if;

  update public.partner_wallets
  set balance_cents = v_new_balance, updated_at = now()
  where partner_id = p_partner_id
  returning * into v_wallet;

  insert into public.wallet_transactions (
    partner_id, type, amount_cents, balance_after_cents, reason, created_by
  )
  values (p_partner_id, 'manual_adjustment', p_amount_cents, v_new_balance, p_reason, auth.uid());
  return v_wallet;
end;
$$;

create or replace function public.credit_wallet_from_stripe(
  p_partner_id uuid,
  p_amount_cents integer,
  p_stripe_event_id text
)
returns public.partner_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.partner_wallets;
  v_transaction_id uuid;
  v_new_balance integer;
begin
  if not (public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role') then
    raise exception using errcode = 'A0001', message = 'ADMIN_REQUIRED';
  end if;
  if p_amount_cents <= 0 then
    raise exception using errcode = 'A0006', message = 'INVALID_AMOUNT';
  end if;
  if p_stripe_event_id is null or btrim(p_stripe_event_id) = '' then
    raise exception using errcode = 'A0007', message = 'STRIPE_EVENT_REQUIRED';
  end if;

  select w.* into v_wallet
  from public.partner_wallets w
  where w.partner_id = p_partner_id
  for update;
  if not found then
    raise exception using errcode = 'A0004', message = 'WALLET_NOT_FOUND';
  end if;

  insert into public.wallet_transactions (
    partner_id, type, amount_cents, balance_after_cents, stripe_event_id, created_by
  )
  values (
    p_partner_id, 'top_up', p_amount_cents, v_wallet.balance_cents + p_amount_cents,
    p_stripe_event_id, auth.uid()
  )
  on conflict (stripe_event_id) where stripe_event_id is not null do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    return v_wallet;
  end if;

  v_new_balance := v_wallet.balance_cents + p_amount_cents;
  update public.partner_wallets
  set balance_cents = v_new_balance, updated_at = now()
  where partner_id = p_partner_id
  returning * into v_wallet;
  update public.wallet_transactions
  set balance_after_cents = v_new_balance
  where id = v_transaction_id;
  return v_wallet;
end;
$$;

alter table public.brands enable row level security;
alter table public.profiles enable row level security;
alter table public.partners enable row level security;
alter table public.partner_brand_memberships enable row level security;
alter table public.services enable row level security;
alter table public.partner_services enable row level security;
alter table public.partner_postcodes enable row level security;
alter table public.leads enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.lead_photos enable row level security;
alter table public.partner_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.lead_purchases enable row level security;

create policy brands_authenticated_select on public.brands
  for select to authenticated using (true);
create policy brands_admin_all on public.brands
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy profiles_own_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy partners_own_select on public.partners
  for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy partners_admin_all on public.partners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy memberships_own_select on public.partner_brand_memberships
  for select to authenticated using (
    partner_id = public.current_partner_id() or public.is_admin()
  );
create policy memberships_admin_all on public.partner_brand_memberships
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy services_authenticated_select on public.services
  for select to authenticated using (true);
create policy services_admin_all on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy partner_services_own_select on public.partner_services
  for select to authenticated using (
    partner_id = public.current_partner_id() or public.is_admin()
  );
create policy partner_services_admin_all on public.partner_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy partner_postcodes_own_select on public.partner_postcodes
  for select to authenticated using (
    partner_id = public.current_partner_id() or public.is_admin()
  );
create policy partner_postcodes_admin_all on public.partner_postcodes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy leads_partner_select on public.leads
  for select to authenticated using (
    public.is_admin()
    or (
      status = 'available'
      and public.partner_can_see_lead(public.current_partner_id(), id)
    )
    or exists (
      select 1
      from public.lead_purchases lp
      where lp.lead_id = leads.id
        and lp.partner_id = public.current_partner_id()
    )
  );
create policy leads_admin_all on public.leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lead_contacts_purchased_select on public.lead_contacts
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1
      from public.lead_purchases lp
      where lp.lead_id = lead_contacts.lead_id
        and lp.partner_id = public.current_partner_id()
        and lp.refunded_at is null
    )
  );
create policy lead_contacts_admin_all on public.lead_contacts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lead_photos_purchased_select on public.lead_photos
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1
      from public.lead_purchases lp
      where lp.lead_id = lead_photos.lead_id
        and lp.partner_id = public.current_partner_id()
        and lp.refunded_at is null
    )
  );
create policy lead_photos_admin_all on public.lead_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy partner_wallets_own_select on public.partner_wallets
  for select to authenticated using (
    partner_id = public.current_partner_id() or public.is_admin()
  );
create policy partner_wallets_admin_all on public.partner_wallets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy wallet_transactions_own_select on public.wallet_transactions
  for select to authenticated using (
    partner_id = public.current_partner_id() or public.is_admin()
  );
create policy wallet_transactions_admin_all on public.wallet_transactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lead_purchases_own_select on public.lead_purchases
  for select to authenticated using (
    partner_id = public.current_partner_id() or public.is_admin()
  );
create policy lead_purchases_admin_all on public.lead_purchases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on function public.is_admin() from public;
revoke all on function public.current_partner_id() from public;
revoke all on function public.partner_can_see_lead(uuid, uuid) from public;
revoke all on function public.purchase_lead(uuid) from public;
revoke all on function public.refund_purchase(uuid, text) from public;
revoke all on function public.admin_adjust_wallet(uuid, integer, text) from public;
revoke all on function public.credit_wallet_from_stripe(uuid, integer, text) from public;
revoke all on function public.create_partner_wallet() from public;

grant execute on function public.purchase_lead(uuid) to authenticated;
grant execute on function public.refund_purchase(uuid, text) to authenticated;
grant execute on function public.admin_adjust_wallet(uuid, integer, text) to authenticated;
grant execute on function public.credit_wallet_from_stripe(uuid, integer, text) to authenticated;
