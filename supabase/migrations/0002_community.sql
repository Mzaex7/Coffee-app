-- BrewRef — community advice aggregation
--
-- get_community_bean_stats() is the ONLY way cross-user data leaves the
-- database. It is SECURITY DEFINER (runs as the function owner, bypassing RLS)
-- precisely so it can read other users' brews — but it returns *anonymized
-- aggregates only* (no user_id, no row-level data) and enforces:
--   * owner opted in (profiles.share_brews = true)
--   * the calling user's own brews are excluded
--   * k-anonymity: at least MIN_SHOTS brews from at least MIN_BREWERS distinct
--     users, otherwise it returns NULL (nothing identifiable leaks).

create or replace function public.get_community_bean_stats(p_bean_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  min_shots   constant int := 3;   -- k-anonymity: minimum sample size
  min_brewers constant int := 2;   -- ...from at least this many distinct users
  v_caller    uuid := auth.uid();
  v_shots     int;
  v_brewers   int;
  v_result    jsonb;
  v_top_count int;
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
    return null;  -- not enough data to anonymize safely
  end if;

  -- Recompute aggregates over the same pool. Medians via percentile_cont.
  with pool as (
    select b.dose_in, b.dose_out, b.time_seconds, b.temperature, b.rating,
           (b.dose_out / nullif(b.dose_in, 0)) as ratio
    from public.brew_logs b
    join public.profiles p on p.id = b.user_id
    where b.bean_key = lower(btrim(p_bean_key))
      and p.share_brews = true
      and (v_caller is null or b.user_id <> v_caller)
      and b.dose_in > 0
  ),
  top as (
    select * from pool where rating is not null and rating >= 4
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

  -- "Top recipe": median of the highly-rated (>=4) shots, when there are enough.
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

  return v_result;
end;
$$;

-- Only signed-in users may call it; anon cannot.
revoke all on function public.get_community_bean_stats(text) from public;
grant execute on function public.get_community_bean_stats(text) to authenticated;
