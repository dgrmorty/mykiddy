-- Кастомизация аватара-программиста (слои 2D), без доната — открытие по уровню на клиенте.

begin;

alter table public.profiles
  add column if not exists avatar_cosmetic jsonb not null default '{}'::jsonb;

comment on column public.profiles.avatar_cosmetic is 'Надетые слои: { "bg","body","face","hair","top","accessory","gadget": item_id }';

commit;
