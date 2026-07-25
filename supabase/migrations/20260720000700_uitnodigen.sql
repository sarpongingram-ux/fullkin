-- Fullkin — Uitnodigen & claimen
--
-- Een uitnodiging wijst naar een persoon die al op de kaart staat. De
-- uitgenodigde wordt niet uitgenodigd voor een lege app — zijn plek is al
-- ingevuld. Het token in de link is de sleutel tot die plek.

-- ---------------------------------------------------------------------------
-- invite_preview — wat de uitnodigingspagina toont vóór inloggen.
--
-- Callable door anon: wie de link heeft, mag zien wie hem uitnodigde en voor
-- welke familie. Het token is het geheim. Geen gevoelige data — alleen namen.
-- ---------------------------------------------------------------------------

create or replace function invite_preview(invite_token text)
returns table (
  network_name      text,
  inviter_name      text,
  person_first_name text,
  person_last_name  text,
  status            invite_status,
  expired           boolean
)
language sql stable security definer set search_path = public as $$
  select
    fn.name,
    inv_p.first_name || ' ' || inv_p.last_name,
    p.first_name,
    p.last_name,
    i.status,
    i.expires_at < now()
  from invites i
  join family_networks fn on fn.id = i.network_id
  join persons p     on p.id = i.person_id
  join persons inv_p on inv_p.id = i.invited_by
  where i.token = invite_token;
$$;

revoke execute on function invite_preview(text) from public;
grant execute on function invite_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- claim_invite — de ingelogde gebruiker claimt de gereserveerde persoon.
--
-- SECURITY DEFINER omdat de nieuwe gebruiker nog geen rechten heeft op de
-- persoon (claimed_by is nog null, dus de gewone update-policy blokkeert).
-- Het geldige token verleent die ene, precieze bevoegdheid.
-- ---------------------------------------------------------------------------

create or replace function claim_invite(invite_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv    invites%rowtype;
  target persons%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om je plek te claimen.';
  end if;

  select * into inv from invites where token = invite_token;
  if not found then
    raise exception 'Deze uitnodiging bestaat niet.';
  end if;
  if inv.status <> 'open' then
    raise exception 'Deze uitnodiging is al gebruikt.';
  end if;
  if inv.expires_at < now() then
    raise exception 'Deze uitnodiging is verlopen.';
  end if;

  select * into target from persons where id = inv.person_id;

  -- Al door iemand anders geclaimd?
  if target.claimed_by is not null and target.claimed_by <> auth.uid() then
    raise exception 'Dit profiel is al door iemand anders geclaimd.';
  end if;

  -- Heeft deze gebruiker al een ander profiel in dezelfde familie?
  if exists (
    select 1 from persons
    where claimed_by = auth.uid()
      and network_id = inv.network_id
      and id <> inv.person_id
  ) then
    raise exception 'Je hebt in deze familie al een eigen profiel.';
  end if;

  update persons set claimed_by = auth.uid() where id = inv.person_id;
  update invites
    set status = 'geaccepteerd', accepted_at = now()
    where id = inv.id;

  return inv.person_id;
end;
$$;

revoke execute on function claim_invite(text) from public, anon;
grant execute on function claim_invite(text) to authenticated;
