-- Foto's in de ontdek-chat (cross-family).
--
-- family-album is netwerk-privé en werkt dus niet tussen twee families. Daarom een aparte
-- PRIVATE bucket 'ontdek-media' die volledig via de service-client loopt: uploaden via een
-- signed upload URL, tonen via een signed download URL. Autorisatie loopt via
-- ontdek_berichten_met (alleen deelnemers krijgen de berichten → en dus de foto-paden).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ontdek-media', 'ontdek-media', false, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Een bericht is tekst en/of een foto.
alter table public.ontdek_berichten add column if not exists foto_pad text;
alter table public.ontdek_berichten alter column tekst drop not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ontdek_bericht_inhoud'
      and conrelid = 'public.ontdek_berichten'::regclass
  ) then
    alter table public.ontdek_berichten
      add constraint ontdek_bericht_inhoud check (tekst is not null or foto_pad is not null);
  end if;
end $$;

-- Sturen: tekst en/of foto. (Oude 2-arg versie droppen; anders ontstaat een dubbele
-- overload en wordt de aanroep ambigu.)
drop function if exists public.stuur_ontdek_bericht(uuid, text);
create or replace function public.stuur_ontdek_bericht(
  p_ander uuid, p_tekst text default null, p_foto_pad text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare mij uuid; a uuid; b uuid; g uuid; ander_net uuid; ander_claimed uuid; schoon text;
begin
  mij := me();
  if mij is null then raise exception 'Je bent niet gekoppeld.'; end if;
  schoon := nullif(btrim(coalesce(p_tekst, '')), '');
  if schoon is null and p_foto_pad is null then raise exception 'Leeg bericht.'; end if;
  if mij = p_ander then raise exception 'Ongeldige ontvanger.'; end if;
  if not exists (select 1 from ontdekte_familie(mij) where ontdekt_id = p_ander) then
    raise exception 'Je kunt deze persoon (nog) geen bericht sturen.';
  end if;

  a := least(mij, p_ander); b := greatest(mij, p_ander);
  insert into ontdek_gesprekken (persoon_a, persoon_b) values (a, b)
    on conflict (persoon_a, persoon_b) do nothing;
  select id into g from ontdek_gesprekken where persoon_a = a and persoon_b = b;

  insert into ontdek_berichten (gesprek_id, afzender_id, tekst, foto_pad)
    values (g, mij, schoon, p_foto_pad);
  update ontdek_gesprekken set laatste_bericht_op = now() where id = g;

  select network_id, claimed_by into ander_net, ander_claimed from persons where id = p_ander;
  if ander_claimed is not null then
    insert into notifications (network_id, recipient_person_id, actor_person_id, kind, subject_type, subject_id)
    values (ander_net, p_ander, mij, 'ontdek_bericht', 'ontdek', mij);
  end if;
end $$;
revoke execute on function public.stuur_ontdek_bericht(uuid,text,text) from anon;
grant execute on function public.stuur_ontdek_bericht(uuid,text,text) to authenticated, service_role;

-- Lezen: foto_pad erbij (returnvorm wijzigt → eerst droppen).
drop function if exists public.ontdek_berichten_met(uuid);
create or replace function public.ontdek_berichten_met(p_ander uuid)
returns table(id uuid, is_van_mij boolean, afzender_naam text, tekst text, foto_pad text, aangemaakt_op timestamptz)
language sql stable security definer set search_path = public as $$
  select bericht.id, bericht.afzender_id = me(),
         p.first_name || ' ' || p.last_name, bericht.tekst, bericht.foto_pad, bericht.aangemaakt_op
  from ontdek_gesprekken g
  join ontdek_berichten bericht on bericht.gesprek_id = g.id
  join persons p on p.id = bericht.afzender_id
  where g.persoon_a = least(me(), p_ander)
    and g.persoon_b = greatest(me(), p_ander)
  order by bericht.aangemaakt_op;
$$;
revoke execute on function public.ontdek_berichten_met(uuid) from anon;
grant execute on function public.ontdek_berichten_met(uuid) to authenticated, service_role;

-- Inbox: toon "📷 Foto" als het laatste bericht een foto zonder tekst is.
create or replace function public.mijn_ontdek_gesprekken()
returns table(ander_id uuid, ander_naam text, ander_familie text, laatste_tekst text,
              laatste_op timestamptz, ongelezen boolean)
language sql stable security definer set search_path = public as $$
  select
    case when g.persoon_a = me() then g.persoon_b else g.persoon_a end,
    p.first_name || ' ' || p.last_name,
    fn.name,
    coalesce(lb.tekst, case when lb.foto_pad is not null then '📷 Foto' end),
    g.laatste_bericht_op,
    (lb.afzender_id <> me()
     and (gl.gelezen_tot is null or g.laatste_bericht_op > gl.gelezen_tot))
  from ontdek_gesprekken g
  join persons p on p.id = (case when g.persoon_a = me() then g.persoon_b else g.persoon_a end)
  join family_networks fn on fn.id = p.network_id
  left join lateral (
    select tekst, foto_pad, afzender_id from ontdek_berichten b
    where b.gesprek_id = g.id order by b.aangemaakt_op desc limit 1
  ) lb on true
  left join ontdek_gelezen gl on gl.gesprek_id = g.id and gl.persoon_id = me()
  where (g.persoon_a = me() or g.persoon_b = me())
    and g.laatste_bericht_op is not null
  order by g.laatste_bericht_op desc;
$$;
revoke execute on function public.mijn_ontdek_gesprekken() from anon;
grant execute on function public.mijn_ontdek_gesprekken() to authenticated, service_role;
