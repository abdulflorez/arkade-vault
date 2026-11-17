-- Spec 06: ROCAS (simulador) se reemplaza por ASTEROX.
-- Borra las puntuaciones que el simulador de ROCAS guardó durante el spec 05.
delete from public.scores where game_id = 'rocas';
