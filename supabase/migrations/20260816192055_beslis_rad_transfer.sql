drop function if exists beslis_rad(uuid, rad_choice, uuid);

create or replace function beslis_rad(
  p_draw uuid, p_choice rad_choice, p_recipient uuid, p_transfer text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  d rad_draws%rowtype; winner_uid uuid;
begin
  select * into d from rad_draws where id = p_draw;
  if not found then raise exception 'Trekking niet gevonden'; end if;
  if d.status = 'besloten' then return; end if;

  select claimed_by into winner_uid from persons where id = d.winner_person_id;
  if winner_uid is null or winner_uid <> auth.uid() then
    raise exception 'Alleen de winnaar kan beslissen';
  end if;

  update rad_draws
    set choice = p_choice,
        recipient_person_id = case when p_choice = 'gunnen' then p_recipient else null end,
        status = 'besloten',
        decided_at = now(),
        stripe_transfer_id = p_transfer
    where id = p_draw;

  if p_choice in ('zelf', 'gunnen', 'dromen') and d.prize_cents > 0 then
    insert into pot_ledger (network_id, kind, amount_cents, person_id, description)
    values (
      d.network_id, 'uitkering', -d.prize_cents,
      case when p_choice = 'gunnen' then p_recipient else d.winner_person_id end,
      'Uitkering Rad ' || d.year
    );
  end if;
end;
$$;

revoke execute on function beslis_rad(uuid, rad_choice, uuid, text) from public, anon;
grant execute on function beslis_rad(uuid, rad_choice, uuid, text) to authenticated;
