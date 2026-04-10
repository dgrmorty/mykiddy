-- Единые штатные ИИ-аватары из фронта: /avatars/student-boy.png | student-girl.png
-- Выбор как в data/defaultAvatars.ts: первый байт UUID (совпадает с get_byte(uuid_send(id), 0)).
update public.profiles
set avatar = case
  when mod(get_byte(uuid_send(id), 0), 2) = 0 then '/avatars/student-boy.png'
  else '/avatars/student-girl.png'
end;
