-- Zachte verwijder-status voor collectes: verborgen, maar record blijft (en de
-- auto-verjaardagpot maakt 'm niet opnieuw aan).
alter type collection_status add value if not exists 'verwijderd';
