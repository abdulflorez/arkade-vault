-- Perfiles públicos de usuario (spec 04).
-- Un perfil por fila de auth.users, creado por trigger al registrarse.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 3 and 20),
  created_at timestamptz not null default now()
);

-- Unicidad sin distinguir mayúsculas: "PX_Kai" y "px_kai" chocan.
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- RLS: lectura pública; sin políticas de insert/update/delete para clientes.
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- Crea el perfil a partir del username enviado en signUp (options.data.username).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

-- Solo la invoca el trigger: nadie debe poder llamarla vía la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
