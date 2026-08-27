create policy brands_anon_active_select on public.brands
  for select to anon
  using (active);
