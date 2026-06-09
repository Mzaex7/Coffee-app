-- BrewRef — AI v2: advice persistence, rate limiting, same-grinder community.
--
-- advice_logs stores every coaching round so:
--   1. the Brew Doctor can reference its previous advice for the same bean and
--      truly iterate ("did the experiment work?") instead of starting cold,
--   2. row counts double as a per-user rate limit for the Gemini call.

create table if not exists public.advice_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  brew_id    bigint references public.brew_logs (id) on delete set null,
  bean_key   text,
  advice     jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists advice_logs_user_created_idx
  on public.advice_logs (user_id, created_at desc);

alter table public.advice_logs enable row level security;

create policy "advice_logs_select_own" on public.advice_logs
  for select using (auth.uid() = user_id);
create policy "advice_logs_insert_own" on public.advice_logs
  for insert with check (auth.uid() = user_id);
create policy "advice_logs_delete_own" on public.advice_logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Community stats v2 — adds optional same-grinder aggregation.
-- Grind-setting numbers are only comparable on the same grinder model, which
-- makes "median grind for this bean on YOUR grinder" the most valuable
-- community signal. Same privacy rules as v1: opt-in, caller excluded,
-- k-anonymity (>= 3 shots from >= 2 distinct users) per pool.
-- ---------------------------------------------------------------------------
drop function if exists public.get_community_bean_stats(text);

create or replace function public.get_community_bean_stats(
  p_bean_key text,
  p_grinder_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  min_shots   constant int := 3;
  min_brewers constant int := 2;
  v_caller    uuid := auth.uid();
  v_shots     int;
  v_brewers   int;
  v_result    jsonb;
  v_top_count int;
  g_shots     int;
  g_brewers   int;
  v_grinder   jsonb;
begin
  if p_bean_key is null or btrim(p_bean_key) = '' then
    return null;
  end if;

  -- Pool: shared brews on this bean, from other users, whose owner opted in.
  with pool as (
    select b.user_id, b.dose_in, b.dose_out, b.time_seconds, b.temperature, b.rating
    from public.brew_logs b
    join public.profiles p on p.id = b.user_id
    where b.bean_key = lower(btrim(p_bean_key))
      and p.share_brews = true
      and (v_caller is null or b.user_id <> v_caller)
      and b.dose_in > 0
  )
  select count(*)::int, count(distinct user_id)::int
    into v_shots, v_brewers
  from pool;

  if v_shots < min_shots or v_brewers < min_brewers then
    return null;
  end if;

  with pool as (
    select b.dose_in, b.dose_out, b.time_seconds, b.temperature, b.rating,
           (b.dose_out / nullif(b.dose_in, 0)) as ratio
    from public.brew_logs b
    join public.profiles p on p.id = b.user_id
    where b.bean_key = lower(btrim(p_bean_key))
      and p.share_brews = true
      and (v_caller is null or b.user_id <> v_caller)
      and b.dose_in > 0
  )
  select
    jsonb_build_object(
      'brewers', v_brewers,
      'shots', v_shots,
      'median', jsonb_build_object(
        'doseIn',  round(percentile_cont(0.5) within group (order by dose_in)::numeric, 1),
        'doseOut', round(percentile_cont(0.5) within group (order by dose_out)::numeric, 1),
        'ratio',   round(percentile_cont(0.5) within group (order by ratio)::numeric, 2),
        'timeSeconds', round(percentile_cont(0.5) within group (order by time_seconds)::numeric, 0),
        'temperature', round(percentile_cont(0.5) within group (order by temperature)::numeric, 0),
        'rating',  round(percentile_cont(0.5) within group (order by rating)::numeric, 1)
      )
    )
    into v_result
  from pool;

  -- "Top recipe": median of the highly-rated (>= 4) shots, when there are enough.
  select count(*)::int into v_top_count
  from public.brew_logs b
  join public.profiles p on p.id = b.user_id
  where b.bean_key = lower(btrim(p_bean_key))
    and p.share_brews = true
    and (v_caller is null or b.user_id <> v_caller)
    and b.dose_in > 0
    and b.rating is not null and b.rating >= 4;

  if v_top_count >= 2 then
    with top as (
      select b.dose_in, b.dose_out, b.time_seconds, b.temperature, b.rating,
             (b.dose_out / nullif(b.dose_in, 0)) as ratio
      from public.brew_logs b
      join public.profiles p on p.id = b.user_id
      where b.bean_key = lower(btrim(p_bean_key))
        and p.share_brews = true
        and (v_caller is null or b.user_id <> v_caller)
        and b.dose_in > 0
        and b.rating is not null and b.rating >= 4
    )
    select v_result || jsonb_build_object(
      'topRecipe', jsonb_build_object(
        'shots', v_top_count,
        'doseIn',  round(percentile_cont(0.5) within group (order by dose_in)::numeric, 1),
        'doseOut', round(percentile_cont(0.5) within group (order by dose_out)::numeric, 1),
        'ratio',   round(percentile_cont(0.5) within group (order by ratio)::numeric, 2),
        'timeSeconds', round(percentile_cont(0.5) within group (order by time_seconds)::numeric, 0),
        'temperature', round(percentile_cont(0.5) within group (order by temperature)::numeric, 0),
        'rating',  round(percentile_cont(0.5) within group (order by rating)::numeric, 1)
      )
    )
    into v_result
    from top;
  end if;

  -- Same bean + same grinder: median numeric grind setting (only rows whose
  -- grind_setting parses as a number are comparable).
  if p_grinder_key is not null and btrim(p_grinder_key) <> '' then
    select count(*)::int, count(distinct b.user_id)::int
      into g_shots, g_brewers
    from public.brew_logs b
    join public.profiles p on p.id = b.user_id
    where b.bean_key = lower(btrim(p_bean_key))
      and b.grinder_key = lower(btrim(p_grinder_key))
      and p.share_brews = true
      and (v_caller is null or b.user_id <> v_caller)
      and b.grind_setting ~ '^\s*\d+(\.\d+)?\s*$';

    if g_shots >= min_shots and g_brewers >= min_brewers then
      with gpool as (
        select (btrim(b.grind_setting))::numeric as grind_num,
               b.time_seconds, b.rating
        from public.brew_logs b
        join public.profiles p on p.id = b.user_id
        where b.bean_key = lower(btrim(p_bean_key))
          and b.grinder_key = lower(btrim(p_grinder_key))
          and p.share_brews = true
          and (v_caller is null or b.user_id <> v_caller)
          and b.grind_setting ~ '^\s*\d+(\.\d+)?\s*$'
      )
      select jsonb_build_object(
        'brewers', g_brewers,
        'shots', g_shots,
        'medianGrind', round(percentile_cont(0.5) within group (order by grind_num)::numeric, 1),
        'medianTime',  round(percentile_cont(0.5) within group (order by time_seconds)::numeric, 0),
        'medianRating', round(percentile_cont(0.5) within group (order by rating)::numeric, 1)
      )
      into v_grinder
      from gpool;

      v_result := v_result || jsonb_build_object('sameGrinder', v_grinder);
    end if;
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_community_bean_stats(text, text) from public;
grant execute on function public.get_community_bean_stats(text, text) to authenticated;
