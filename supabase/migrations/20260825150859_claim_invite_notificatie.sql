create or replace function public.claim_invite(invite_token text)
 returns uuid
 language plpgsql security definer set search_path to 'public'
as $function$
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

  if target.claimed_by is not null and target.claimed_by <> auth.uid() then
    raise exception 'Dit profiel is al door iemand anders geclaimd.';
  end if;

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

  -- Meld de uitnodiger dat de uitnodiging is geaccepteerd. Direct ingevoegd
  -- (SECURITY DEFINER omzeilt RLS); actor = het nieuwe lid, ontvanger = de
  -- uitnodiger. Alleen als er een uitnodiger is en dat niet hetzelfde is.
  if inv.invited_by is not null and inv.invited_by <> inv.person_id then
    insert into notifications
      (network_id, recipient_person_id, actor_person_id, kind, subject_type, subject_id)
    values
      (inv.network_id, inv.invited_by, inv.person_id, 'uitnodiging_geaccepteerd', 'persoon', inv.person_id);
  end if;

  return inv.person_id;
end;
$function$;
