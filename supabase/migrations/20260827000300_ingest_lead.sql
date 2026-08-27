create or replace function public.ingest_lead(
  p_brand_id uuid,
  p_service_id uuid,
  p_postal_code text,
  p_city text,
  p_description text,
  p_price_cents integer,
  p_photo_count integer,
  p_extra_data jsonb,
  p_source text,
  p_name text,
  p_phone text,
  p_email text,
  p_full_address text,
  p_consent_at timestamptz,
  p_privacy_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
begin
  insert into public.leads (
    brand_id,
    service_id,
    postal_code,
    city,
    description,
    price_cents,
    photo_count,
    extra_data,
    source
  )
  values (
    p_brand_id,
    p_service_id,
    p_postal_code,
    p_city,
    p_description,
    p_price_cents,
    p_photo_count,
    coalesce(p_extra_data, '{}'::jsonb),
    p_source
  )
  returning id into v_lead_id;

  insert into public.lead_contacts (
    lead_id,
    name,
    phone,
    email,
    full_address,
    consent_at,
    privacy_version
  )
  values (
    v_lead_id,
    p_name,
    p_phone,
    p_email,
    p_full_address,
    p_consent_at,
    p_privacy_version
  );

  return v_lead_id;
end;
$$;

revoke all on function public.ingest_lead(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text
) from public;

grant execute on function public.ingest_lead(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text
) to service_role;
