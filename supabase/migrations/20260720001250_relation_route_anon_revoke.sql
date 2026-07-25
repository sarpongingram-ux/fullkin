-- relation_route is SECURITY DEFINER en niet netwerk-gated; anon mag 'm niet
-- kunnen aanroepen. Bij aanmaak alleen van public ingetrokken, nu ook van anon.
revoke execute on function relation_route(uuid, uuid) from anon;
