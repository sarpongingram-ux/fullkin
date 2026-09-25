-- CONNECT — tweeweg-chat tussen ontdekte familieleden (cross-family).
--
-- De bestaande familie-chat is netwerk-gebonden (chat_rooms.network_id NOT NULL, RLS op
-- my_networks) en kan dus geen gesprek tussen twee VERSCHILLENDE families dragen. Deze
-- laag modelleert een 1-op-1 gesprek tussen twee personen die via discovery verbonden
-- zijn. Toegang loopt uitsluitend via SECURITY DEFINER-functies; de tabellen staan achter
-- RLS zonder policies (alleen definer/service_role erbij).

create table if not exists public.ontdek_gesprekken (
  id uuid primary key default gen_random_uuid(),
  persoon_a uuid not null references public.persons(id) on delete cascade,
  persoon_b uuid not null references public.persons(id) on delete cascade,
  aangemaakt_op timestamptz not null default now(),
  laatste_bericht_op timestamptz,
  constraint ontdek_gesprek_norm check (persoon_a < persoon_b),
  constraint ontdek_gesprek_paar unique (persoon_a, persoon_b)
);
alter table public.ontdek_gesprekken enable row level security;

create table if not exists public.ontdek_berichten (
  id uuid primary key default gen_random_uuid(),
  gesprek_id uuid not null references public.ontdek_gesprekken(id) on delete cascade,
  afzender_id uuid not null references public.persons(id),
  tekst text not null,
  aangemaakt_op timestamptz not null default now()
);
alter table public.ontdek_berichten enable row level security;
create index if not exists ontdek_berichten_gesprek_idx on public.ontdek_berichten(gesprek_id, aangemaakt_op);

create table if not exists public.ontdek_gelezen (
  gesprek_id uuid not null references public.ontdek_gesprekken(id) on delete cascade,
  persoon_id uuid not null references public.persons(id) on delete cascade,
  gelezen_tot timestamptz not null default now(),
  primary key (gesprek_id, persoon_id)
);
alter table public.ontdek_gelezen enable row level security;

-- ---------------------------------------------------------------------------
-- Bericht sturen naar een ontdekt familielid. Get-or-create het gesprek.
-- Alleen toegestaan als p_ander daadwerkelijk een ontdekt familielid is.
-- ---------------------------------------------------------------------------
create or replace function public.stuur_ontdek_bericht(p_ander uuid, p_tekst text)
returns void language plpgsql security definer set search_path = public as $$
declare mij uuid; a uuid; b uuid; g uuid; ander_net uuid; ander_claimed uuid;
begin
  mij := me();
  if mij is null then raise exception 'Je bent niet gekoppeld.'; end if;
  if p_tekst is null or btrim(p_tekst) = '' then raise exception 'Leeg bericht.'; end if;
  if mij = p_ander then raise exception 'Ongeldige ontvanger.'; end if;
  if not exists (select 1 from ontdekte_familie(mij) where ontdekt_id = p_ander) then
    raise exception 'Je kunt deze persoon (nog) geen bericht sturen.';
  end if;

  a := least(mij, p_ander); b := greatest(mij, p_ander);
  insert into ontdek_gesprekken (persoon_a, persoon_b) values (a, b)
    on conflict (persoon_a, persoon_b) do nothing;
  select id into g from ontdek_gesprekken where persoon_a = a and persoon_b = b;

  insert into ontdek_berichten (gesprek_id, afzender_id, tekst)
    values (g, mij, btrim(p_tekst));
  update ontdek_gesprekken set laatste_bericht_op = now() where id = g;

  -- Melding voor de ontvanger, als die een echt account heeft.
  select network_id, claimed_by into ander_net, ander_claimed from persons where id = p_ander;
  if ander_claimed is not null then
    insert into notifications (network_id, recipient_person_id, actor_person_id, kind, subject_type, subject_id)
    values (ander_net, p_ander, mij, 'ontdek_bericht', 'ontdek', mij);
  end if;
end $$;
revoke execute on function public.stuur_ontdek_bericht(uuid,text) from anon;
grant execute on function public.stuur_ontdek_bericht(uuid,text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Berichten van een gesprek met p_ander (leeg als er nog geen gesprek is).
-- Veilig: er wordt alleen het paar (mij, p_ander) opgevraagd, dus de aanroeper
-- is per definitie deelnemer.
-- ---------------------------------------------------------------------------
create or replace function public.ontdek_berichten_met(p_ander uuid)
returns table(id uuid, is_van_mij boolean, afzender_naam text, tekst text, aangemaakt_op timestamptz)
language sql stable security definer set search_path = public as $$
  select bericht.id, bericht.afzender_id = me(),
         p.first_name || ' ' || p.last_name, bericht.tekst, bericht.aangemaakt_op
  from ontdek_gesprekken g
  join ontdek_berichten bericht on bericht.gesprek_id = g.id
  join persons p on p.id = bericht.afzender_id
  where g.persoon_a = least(me(), p_ander)
    and g.persoon_b = greatest(me(), p_ander)
  order by bericht.aangemaakt_op;
$$;
revoke execute on function public.ontdek_berichten_met(uuid) from anon;
grant execute on function public.ontdek_berichten_met(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Mijn ontdek-gesprekken (inbox): tegenpartij, laatste bericht, ongelezen-vlag.
-- ---------------------------------------------------------------------------
create or replace function public.mijn_ontdek_gesprekken()
returns table(ander_id uuid, ander_naam text, ander_familie text, laatste_tekst text,
              laatste_op timestamptz, ongelezen boolean)
language sql stable security definer set search_path = public as $$
  select
    case when g.persoon_a = me() then g.persoon_b else g.persoon_a end,
    p.first_name || ' ' || p.last_name,
    fn.name,
    lb.tekst,
    g.laatste_bericht_op,
    (lb.afzender_id <> me()
     and (gl.gelezen_tot is null or g.laatste_bericht_op > gl.gelezen_tot))
  from ontdek_gesprekken g
  join persons p on p.id = (case when g.persoon_a = me() then g.persoon_b else g.persoon_a end)
  join family_networks fn on fn.id = p.network_id
  left join lateral (
    select tekst, afzender_id from ontdek_berichten b
    where b.gesprek_id = g.id order by b.aangemaakt_op desc limit 1
  ) lb on true
  left join ontdek_gelezen gl on gl.gesprek_id = g.id and gl.persoon_id = me()
  where (g.persoon_a = me() or g.persoon_b = me())
    and g.laatste_bericht_op is not null
  order by g.laatste_bericht_op desc;
$$;
revoke execute on function public.mijn_ontdek_gesprekken() from anon;
grant execute on function public.mijn_ontdek_gesprekken() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Markeer het gesprek met p_ander als gelezen.
-- ---------------------------------------------------------------------------
create or replace function public.markeer_ontdek_gelezen(p_ander uuid)
returns void language plpgsql security definer set search_path = public as $$
declare mij uuid; g uuid;
begin
  mij := me();
  if mij is null then return; end if;
  select id into g from ontdek_gesprekken
   where persoon_a = least(mij, p_ander) and persoon_b = greatest(mij, p_ander);
  if g is null then return; end if;
  insert into ontdek_gelezen (gesprek_id, persoon_id, gelezen_tot)
    values (g, mij, now())
  on conflict (gesprek_id, persoon_id) do update set gelezen_tot = now();
end $$;
revoke execute on function public.markeer_ontdek_gelezen(uuid) from anon;
grant execute on function public.markeer_ontdek_gelezen(uuid) to authenticated, service_role;
