-- Ensure every Supabase Auth user gets a public profile row.
-- The trigger function already exists in earlier migrations; this migration makes
-- the auth.users -> public.profiles wiring explicit and reproducible from git.

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
