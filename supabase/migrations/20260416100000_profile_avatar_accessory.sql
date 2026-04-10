-- Аксессуар ИИ-аватара: отдельные заранее сгенерированные картинки (none | cap | glasses | headphones).
alter table public.profiles
  add column if not exists avatar_accessory text not null default 'none';

comment on column public.profiles.avatar_accessory is 'Аксессуар поверх базового boy/girl: none, cap, glasses, headphones';
