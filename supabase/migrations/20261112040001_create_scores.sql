-- Puntuaciones de los jugadores (spec 05).
-- Una fila por partida guardada; los rankings muestran la mejor marca por jugador.

create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null check (char_length(game_id) between 1 and 40),
  score integer not null check (score between 0 and 99999999),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);

-- RLS: lectura pública; cada usuario solo inserta sus propias marcas.
-- Sin políticas de update/delete para clientes.
alter table public.scores enable row level security;

create policy "Scores are viewable by everyone"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "Users insert their own scores"
  on public.scores for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Mejor marca por jugador y juego (desempate: la marca más antigua gana).
-- security_invoker: la vista respeta el RLS de scores y profiles.
create view public.game_leaderboard
with (security_invoker = true) as
select
  best.game_id,
  best.user_id,
  best.username,
  best.score,
  best.created_at,
  row_number() over (
    partition by best.game_id
    order by best.score desc, best.created_at asc
  ) as rank
from (
  select distinct on (s.game_id, s.user_id)
    s.game_id, s.user_id, p.username, s.score, s.created_at
  from public.scores s
  join public.profiles p on p.id = s.user_id
  order by s.game_id, s.user_id, s.score desc, s.created_at asc
) best;

-- Estadísticas por juego: récord y número de puntuaciones guardadas.
create view public.game_stats
with (security_invoker = true) as
select game_id, max(score) as best, count(*) as plays
from public.scores
group by game_id;
