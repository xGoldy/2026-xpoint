-- SkillSwap schema: tables, constraints, triggers, row-level security and read views.
-- All timestamps are UTC. Times of day (availability) are wall-clock times in Europe/Bratislava.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.localities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 50),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 50),
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  locality_id uuid not null references public.localities (id),
  bio text not null default '' check (char_length(bio) <= 1000),
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  category_id uuid not null references public.categories (id),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index skills_name_lower_key on public.skills (lower(name));

create table public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  role text not null check (role in ('teach', 'learn')),
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  unique (user_id, skill_id, role)
);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- Monday is 0
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint availability_slots_order check (end_time > start_time),
  constraint availability_slots_no_overlap exclude using gist (
    user_id with =,
    weekday with =,
    tsrange(date '2000-01-01' + start_time, date '2000-01-01' + end_time) with &&
  )
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id),
  title text not null check (char_length(btrim(title)) between 3 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  format text not null check (format in ('one_to_one', 'class')),
  level text not null check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  session_count int not null check (session_count between 1 and 20),
  session_duration_min int not null check (session_duration_min between 15 and 480),
  mode text not null check (mode in ('in_person', 'online')),
  locality_id uuid references public.localities (id),
  max_participants int,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  constraint offers_participants check (
    (format = 'one_to_one' and max_participants = 1)
    or (format = 'class' and max_participants between 2 and 100)
  ),
  constraint offers_locality check (mode = 'online' or locality_id is not null)
);
create index offers_skill_idx on public.offers (skill_id) where status = 'active';
create index offers_teacher_idx on public.offers (teacher_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  initiated_by text not null check (initiated_by in ('learner', 'teacher')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  proposed_starts_at timestamptz,
  message text not null default '' check (char_length(message) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index bookings_one_open_per_learner
  on public.bookings (offer_id, learner_id) where status in ('pending', 'accepted');
create index bookings_learner_idx on public.bookings (learner_id);
create index bookings_offer_idx on public.bookings (offer_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  sequence_no int not null check (sequence_no >= 1),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint sessions_order check (ends_at > starts_at),
  constraint sessions_sequence_key unique nulls not distinct (offer_id, booking_id, sequence_no)
);
create index sessions_offer_idx on public.sessions (offer_id, starts_at);
create index sessions_booking_idx on public.sessions (booking_id);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  points smallint not null check (points between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  constraint ratings_not_self check (teacher_id <> learner_id)
);
create index ratings_teacher_idx on public.ratings (teacher_id);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies do not recurse through RLS)
-- ---------------------------------------------------------------------------

create function public.is_offer_teacher(p_offer_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.offers o where o.id = p_offer_id and o.teacher_id = auth.uid()
  );
$$;

create function public.is_booking_party(p_booking_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.offers o on o.id = b.offer_id
    where b.id = p_booking_id
      and (b.learner_id = auth.uid() or o.teacher_id = auth.uid())
  );
$$;

-- Start of the first and end of the last non-cancelled session of a booking.
-- Class bookings share the offer's sessions; 1:1 bookings have their own.
create function public.booking_session_bounds(p_booking_id uuid, out first_start timestamptz, out last_end timestamptz)
language sql stable security definer set search_path = ''
as $$
  select min(se.starts_at), max(se.ends_at)
  from public.bookings b
  join public.offers o on o.id = b.offer_id
  join public.sessions se
    on se.status <> 'cancelled'
   and ((o.format = 'class' and se.offer_id = o.id and se.booking_id is null)
     or (o.format = 'one_to_one' and se.booking_id = b.id))
  where b.id = p_booking_id;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Registration: the profile is created from the sign-up metadata in the same
-- transaction as the auth user, so a duplicate username creates no account.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, username, locality_id)
  values (
    new.id,
    btrim(new.raw_user_meta_data ->> 'first_name'),
    btrim(new.raw_user_meta_data ->> 'last_name'),
    lower(btrim(new.raw_user_meta_data ->> 'username')),
    (new.raw_user_meta_data ->> 'locality_id')::uuid
  );
  -- AUTH-1: skills chosen at registration, as arrays of skill ids.
  insert into public.user_skills (user_id, skill_id, role)
  select new.id, s.id, r.role
  from (values ('teach', 'teach_skill_ids'), ('learn', 'learn_skill_ids')) r(role, field)
  cross join lateral jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> r.field, '[]'::jsonb)) x(skill_id)
  join public.skills s on s.id::text = x.skill_id
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Offers: only the description and the archive status may change (OFFER-4).
create function public.offers_guard_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (new.teacher_id, new.skill_id, new.title, new.format, new.level, new.session_count,
      new.session_duration_min, new.mode, new.locality_id, new.max_participants, new.created_at)
     is distinct from
     (old.teacher_id, old.skill_id, old.title, old.format, old.level, old.session_count,
      old.session_duration_min, old.mode, old.locality_id, old.max_participants, old.created_at) then
    raise exception 'Only the description and status of an offer can be changed' using errcode = 'check_violation';
  end if;
  if old.status = 'archived' and new.status = 'active' then
    raise exception 'An archived offer cannot be reactivated' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger offers_guard_update
  before update on public.offers
  for each row execute function public.offers_guard_update();

-- OFFER-3: creating an offer adds the skill to the teacher's "can teach" list.
create function public.offers_add_teach_skill()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.user_skills (user_id, skill_id, role)
  values (new.teacher_id, new.skill_id, 'teach')
  on conflict (user_id, skill_id, role) do nothing;
  return new;
end;
$$;

create trigger offers_add_teach_skill
  after insert on public.offers
  for each row execute function public.offers_add_teach_skill();

-- Bookings: validation of new requests and invitations.
-- auth.uid() is null only for trusted contexts (migrations, seed, SQL editor).
create function public.bookings_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_offer public.offers;
  v_accepted int;
begin
  select * into v_offer from public.offers where id = new.offer_id;
  if not found then
    raise exception 'Offer not found' using errcode = 'foreign_key_violation';
  end if;
  if new.learner_id = v_offer.teacher_id then
    raise exception 'You cannot book your own offer' using errcode = 'check_violation';
  end if;
  if v_offer.format = 'class' and new.proposed_starts_at is not null then
    raise exception 'Class bookings use the class schedule' using errcode = 'check_violation';
  end if;
  if v_offer.format = 'one_to_one' and new.proposed_starts_at is null then
    raise exception 'A 1:1 booking needs a proposed start time' using errcode = 'check_violation';
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if new.status <> 'pending' then
    raise exception 'New bookings start as pending' using errcode = 'check_violation';
  end if;
  if (new.initiated_by = 'learner' and auth.uid() <> new.learner_id)
     or (new.initiated_by = 'teacher' and auth.uid() <> v_offer.teacher_id) then
    raise exception 'Not allowed to create this booking' using errcode = 'insufficient_privilege';
  end if;
  if v_offer.status <> 'active' then
    raise exception 'This offer is archived' using errcode = 'check_violation';
  end if;
  if v_offer.format = 'one_to_one' and new.proposed_starts_at <= now() then
    raise exception 'The proposed start time must be in the future' using errcode = 'check_violation';
  end if;
  if v_offer.format = 'class' then
    select count(*) into v_accepted from public.bookings
    where offer_id = v_offer.id and status = 'accepted';
    if v_accepted >= v_offer.max_participants then
      raise exception 'This class is full' using errcode = 'check_violation';
    end if;
    if not exists (
      select 1 from public.sessions
      where offer_id = v_offer.id and booking_id is null and status = 'scheduled' and starts_at > now()
    ) then
      raise exception 'This class has no upcoming sessions' using errcode = 'check_violation';
    end if;
  end if;

  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookings_before_insert
  before insert on public.bookings
  for each row execute function public.bookings_before_insert();

-- Bookings: status transitions (Section 3, booking lifecycle).
create function public.bookings_before_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_offer public.offers;
  v_uid uuid := auth.uid();
  v_is_teacher boolean;
  v_is_learner boolean;
  v_accepted int;
  v_first timestamptz;
  v_last timestamptz;
begin
  if (new.offer_id, new.learner_id, new.initiated_by, new.proposed_starts_at, new.message, new.created_at)
     is distinct from
     (old.offer_id, old.learner_id, old.initiated_by, old.proposed_starts_at, old.message, old.created_at) then
    raise exception 'Only the status of a booking can be changed' using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  if v_uid is null or new.status = old.status then
    return new;
  end if;

  select * into v_offer from public.offers where id = new.offer_id for update;
  v_is_teacher := v_uid = v_offer.teacher_id;
  v_is_learner := v_uid = new.learner_id;

  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    if not ((old.initiated_by = 'learner' and v_is_teacher) or (old.initiated_by = 'teacher' and v_is_learner)) then
      raise exception 'Only the invited party can accept or decline' using errcode = 'insufficient_privilege';
    end if;
    if new.status = 'accepted' then
      if v_offer.status <> 'active' then
        raise exception 'This offer is archived' using errcode = 'check_violation';
      end if;
      if v_offer.format = 'class' then
        select count(*) into v_accepted from public.bookings
        where offer_id = v_offer.id and status = 'accepted';
        if v_accepted >= v_offer.max_participants then
          raise exception 'This class is full' using errcode = 'check_violation';
        end if;
      elsif old.proposed_starts_at <= now() then
        raise exception 'The proposed start time has already passed' using errcode = 'check_violation';
      end if;
    end if;
    return new;
  end if;

  if old.status in ('pending', 'accepted') and new.status = 'cancelled' then
    if not (v_is_teacher or v_is_learner) then
      raise exception 'Not allowed to cancel this booking' using errcode = 'insufficient_privilege';
    end if;
    select b.first_start into v_first from public.booking_session_bounds(old.id) b;
    v_first := coalesce(v_first, old.proposed_starts_at);
    if v_first is not null and v_first <= now() then
      raise exception 'A booking cannot be cancelled after its first session has started' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if old.status = 'accepted' and new.status = 'completed' then
    if not v_is_teacher then
      raise exception 'Only the teacher can mark a booking completed' using errcode = 'insufficient_privilege';
    end if;
    select b.last_end into v_last from public.booking_session_bounds(old.id) b;
    if v_last is null or v_last > now() then
      raise exception 'A booking can be completed only after its last session has ended' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  raise exception 'Cannot change a booking from % to %', old.status, new.status using errcode = 'check_violation';
end;
$$;

create trigger bookings_before_update
  before update on public.bookings
  for each row execute function public.bookings_before_update();

-- Bookings: side effects on 1:1 sessions.
create function public.bookings_after_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_offer public.offers;
begin
  if new.status = old.status then
    return null;
  end if;
  select * into v_offer from public.offers where id = new.offer_id;
  if v_offer.format <> 'one_to_one' then
    return null;
  end if;

  if new.status = 'accepted' then
    insert into public.sessions (offer_id, booking_id, sequence_no, starts_at, ends_at)
    values (
      new.offer_id, new.id, 1, new.proposed_starts_at,
      new.proposed_starts_at + make_interval(mins => v_offer.session_duration_min)
    )
    on conflict do nothing;
  elsif new.status = 'cancelled' then
    update public.sessions set status = 'cancelled' where booking_id = new.id and status = 'scheduled';
  elsif new.status = 'completed' then
    update public.sessions set status = 'completed' where booking_id = new.id and status = 'scheduled';
  end if;
  return null;
end;
$$;

create trigger bookings_after_update
  after update on public.bookings
  for each row execute function public.bookings_after_update();

-- Sessions: class sessions are shared, 1:1 sessions belong to one accepted booking.
create function public.sessions_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_offer public.offers;
  v_booking public.bookings;
begin
  select * into v_offer from public.offers where id = new.offer_id;
  if v_offer.format = 'class' and new.booking_id is not null then
    raise exception 'Class sessions are not linked to a booking' using errcode = 'check_violation';
  end if;
  if v_offer.format = 'one_to_one' then
    if new.booking_id is null then
      raise exception '1:1 sessions must belong to a booking' using errcode = 'check_violation';
    end if;
    select * into v_booking from public.bookings where id = new.booking_id;
    if v_booking.offer_id <> new.offer_id then
      raise exception 'Session and booking belong to different offers' using errcode = 'check_violation';
    end if;
  end if;
  if new.sequence_no > v_offer.session_count then
    raise exception 'This offer has only % sessions', v_offer.session_count using errcode = 'check_violation';
  end if;

  if auth.uid() is not null then
    if new.starts_at <= now() then
      raise exception 'Sessions must start in the future' using errcode = 'check_violation';
    end if;
    if v_offer.format = 'one_to_one' and v_booking.status <> 'accepted' then
      raise exception 'Sessions can be added only to an accepted booking' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger sessions_before_insert
  before insert on public.sessions
  for each row execute function public.sessions_before_insert();

-- Ratings: parties come from the booking, never from the client (RATE-3).
create function public.ratings_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_teacher uuid;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if not found then
    raise exception 'Booking not found' using errcode = 'foreign_key_violation';
  end if;
  if v_booking.status <> 'completed' then
    raise exception 'Only a completed booking can receive points' using errcode = 'check_violation';
  end if;
  select teacher_id into v_teacher from public.offers where id = v_booking.offer_id;
  if auth.uid() is not null and auth.uid() <> v_booking.learner_id then
    raise exception 'Only the learner of this booking can give points' using errcode = 'insufficient_privilege';
  end if;
  new.teacher_id := v_teacher;
  new.learner_id := v_booking.learner_id;
  return new;
end;
$$;

create trigger ratings_before_insert
  before insert on public.ratings
  for each row execute function public.ratings_before_insert();

-- ---------------------------------------------------------------------------
-- Row-level security (NFR-3, NFR-4)
-- ---------------------------------------------------------------------------

alter table public.localities enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.availability_slots enable row level security;
alter table public.offers enable row level security;
alter table public.bookings enable row level security;
alter table public.sessions enable row level security;
alter table public.ratings enable row level security;

create policy "localities are public" on public.localities for select using (true);
create policy "categories are public" on public.categories for select using (true);

create policy "profiles are public" on public.profiles for select using (true);
create policy "users update their own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "skills are public" on public.skills for select using (true);
create policy "logged-in users add skills" on public.skills for insert to authenticated
  with check (created_by = auth.uid());

create policy "user skills are public" on public.user_skills for select using (true);
create policy "users add their own skills" on public.user_skills for insert to authenticated
  with check (user_id = auth.uid());
create policy "users update their own skills" on public.user_skills for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users remove their own skills" on public.user_skills for delete to authenticated
  using (user_id = auth.uid());

create policy "availability is visible to members" on public.availability_slots for select to authenticated using (true);
create policy "users add their own availability" on public.availability_slots for insert to authenticated
  with check (user_id = auth.uid());
create policy "users remove their own availability" on public.availability_slots for delete to authenticated
  using (user_id = auth.uid());

create policy "offers are public" on public.offers for select using (true);
create policy "teachers create their own offers" on public.offers for insert to authenticated
  with check (teacher_id = auth.uid() and status = 'active');
create policy "teachers update their own offers" on public.offers for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "class sessions are public, 1:1 sessions are private" on public.sessions for select
  using (booking_id is null or public.is_booking_party(booking_id));
create policy "teachers add sessions to their offers" on public.sessions for insert to authenticated
  with check (public.is_offer_teacher(offer_id));

create policy "booking parties see the booking" on public.bookings for select to authenticated
  using (learner_id = auth.uid() or public.is_offer_teacher(offer_id));
create policy "learners request and teachers invite" on public.bookings for insert to authenticated
  with check (
    (initiated_by = 'learner' and learner_id = auth.uid())
    or (initiated_by = 'teacher' and public.is_offer_teacher(offer_id))
  );
create policy "booking parties change the status" on public.bookings for update to authenticated
  using (learner_id = auth.uid() or public.is_offer_teacher(offer_id))
  with check (learner_id = auth.uid() or public.is_offer_teacher(offer_id));

create policy "ratings are public" on public.ratings for select using (true);
create policy "learners rate their completed bookings" on public.ratings for insert to authenticated
  with check (learner_id = auth.uid());

-- Column-level privileges: read-only columns stay read-only (ACC-1, OFFER-4).
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke update on public.profiles, public.offers, public.bookings, public.sessions, public.skills, public.ratings
  from authenticated;
grant update (first_name, last_name, locality_id, bio) on public.profiles to authenticated;
grant update (description, status) on public.offers to authenticated;
grant update (status) on public.bookings to authenticated;
revoke delete on public.profiles, public.offers, public.bookings, public.sessions, public.skills, public.ratings,
  public.localities, public.categories from authenticated;
revoke insert on public.localities, public.categories, public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- Read views (derived values are never stored; Section 4)
-- ---------------------------------------------------------------------------

create view public.teacher_stats with (security_invoker = true) as
select
  r.teacher_id,
  sum(r.points)::int as points_total,
  count(*)::int as rating_count,
  round(avg(r.points), 2)::float8 as points_average
from public.ratings r
group by r.teacher_id;

-- Owner-privileged on purpose: exposes only seat counts, never who booked.
create view public.offer_stats as
select
  o.id as offer_id,
  ac.accepted_count,
  case when o.format = 'class' then greatest(o.max_participants - ac.accepted_count, 0) end as seats_left,
  (
    select min(se.starts_at) from public.sessions se
    where se.offer_id = o.id and se.booking_id is null and se.status = 'scheduled' and se.starts_at > now()
  ) as next_session_at
from public.offers o
cross join lateral (
  select count(*)::int as accepted_count from public.bookings b
  where b.offer_id = o.id and b.status = 'accepted'
) ac;

create view public.offer_cards with (security_invoker = true) as
select
  o.id, o.teacher_id, o.skill_id, o.title, o.description, o.format, o.level, o.session_count,
  o.session_duration_min, o.mode, o.locality_id, o.max_participants, o.status, o.created_at,
  s.name as skill_name,
  c.name as category_name,
  ol.name as locality_name,
  p.username as teacher_username,
  p.first_name as teacher_first_name,
  p.last_name as teacher_last_name,
  p.locality_id as teacher_locality_id,
  tl.name as teacher_locality_name,
  coalesce(ts.points_total, 0) as points_total,
  coalesce(ts.rating_count, 0) as rating_count,
  os.accepted_count,
  os.seats_left,
  os.next_session_at
from public.offers o
join public.skills s on s.id = o.skill_id
join public.categories c on c.id = s.category_id
join public.profiles p on p.id = o.teacher_id
join public.localities tl on tl.id = p.locality_id
left join public.localities ol on ol.id = o.locality_id
left join public.teacher_stats ts on ts.teacher_id = o.teacher_id
join public.offer_stats os on os.offer_id = o.id;

create view public.skill_catalog with (security_invoker = true) as
select
  s.id, s.name, s.category_id, c.name as category_name, s.created_at,
  count(o.id)::int as active_offer_count,
  count(distinct o.teacher_id)::int as teacher_count
from public.skills s
join public.categories c on c.id = s.category_id
left join public.offers o on o.skill_id = s.id and o.status = 'active'
group by s.id, c.name;

create view public.teacher_directory with (security_invoker = true) as
select
  p.id, p.username, p.first_name, p.last_name, p.locality_id, l.name as locality_name,
  coalesce(ts.points_total, 0) as points_total,
  coalesce(ts.rating_count, 0) as rating_count,
  (select count(*)::int from public.offers o where o.teacher_id = p.id and o.status = 'active') as active_offer_count
from public.profiles p
join public.localities l on l.id = p.locality_id
left join public.teacher_stats ts on ts.teacher_id = p.id;

create view public.booking_cards with (security_invoker = true) as
select
  b.id, b.offer_id, b.learner_id, b.initiated_by, b.status, b.proposed_starts_at, b.message,
  b.created_at, b.updated_at,
  o.title as offer_title, o.format, o.mode, o.level, o.skill_id, o.teacher_id, o.session_count,
  o.session_duration_min, o.status as offer_status,
  s.name as skill_name,
  t.username as teacher_username, t.first_name as teacher_first_name, t.last_name as teacher_last_name,
  l.username as learner_username, l.first_name as learner_first_name, l.last_name as learner_last_name,
  sx.first_session_at, sx.last_session_end_at, sx.next_session_at, sx.session_rows,
  r.id as rating_id, r.points as rating_points, r.comment as rating_comment
from public.bookings b
join public.offers o on o.id = b.offer_id
join public.skills s on s.id = o.skill_id
join public.profiles t on t.id = o.teacher_id
join public.profiles l on l.id = b.learner_id
left join lateral (
  select
    min(se.starts_at) as first_session_at,
    max(se.ends_at) as last_session_end_at,
    min(se.starts_at) filter (where se.status = 'scheduled' and se.starts_at > now()) as next_session_at,
    count(*)::int as session_rows
  from public.sessions se
  where (o.format = 'class' and se.offer_id = o.id and se.booking_id is null and se.status <> 'cancelled')
     or (o.format = 'one_to_one' and se.booking_id = b.id)
) sx on true
left join public.ratings r on r.booking_id = b.id;

-- ---------------------------------------------------------------------------
-- RPC functions
-- ---------------------------------------------------------------------------

-- OFFER-1, OFFER-2: create an offer and, for a class, all its sessions atomically.
create function public.create_offer(
  p_skill_id uuid,
  p_title text,
  p_description text,
  p_format text,
  p_level text,
  p_session_count int,
  p_session_duration_min int,
  p_mode text,
  p_locality_id uuid,
  p_max_participants int,
  p_session_starts timestamptz[]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
  v_starts timestamptz[];
begin
  insert into public.offers (
    teacher_id, skill_id, title, description, format, level, session_count,
    session_duration_min, mode, locality_id, max_participants
  )
  values (
    auth.uid(), p_skill_id, btrim(p_title), coalesce(p_description, ''), p_format, p_level, p_session_count,
    p_session_duration_min, p_mode, case when p_mode = 'in_person' then p_locality_id end,
    case when p_format = 'one_to_one' then 1 else p_max_participants end
  )
  returning id into v_id;

  if p_format = 'class' then
    if coalesce(cardinality(p_session_starts), 0) <> p_session_count then
      raise exception 'Enter a start date and time for every session' using errcode = 'check_violation';
    end if;
    select array_agg(x order by x) into v_starts from unnest(p_session_starts) x;
    insert into public.sessions (offer_id, sequence_no, starts_at, ends_at)
    select v_id, i, v_starts[i], v_starts[i] + make_interval(mins => p_session_duration_min)
    from generate_subscripts(v_starts, 1) i;
  end if;
  return v_id;
end;
$$;

-- BOOK-7: pending bookings awaiting the current user's response.
create function public.pending_response_count()
returns int
language sql stable security invoker set search_path = ''
as $$
  select count(*)::int
  from public.bookings b
  join public.offers o on o.id = b.offer_id
  where b.status = 'pending'
    and ((b.initiated_by = 'learner' and o.teacher_id = auth.uid())
      or (b.initiated_by = 'teacher' and b.learner_id = auth.uid()));
$$;

-- Home page counters: aggregate numbers only.
create function public.community_stats(out skills_offered int, out teachers int, out bookings int)
language sql stable security definer set search_path = ''
as $$
  select
    (select count(distinct skill_id)::int from public.offers where status = 'active'),
    (select count(distinct teacher_id)::int from public.offers where status = 'active'),
    (select count(*)::int from public.bookings where status in ('accepted', 'completed'));
$$;

-- AUTH-3: check a username before sign-up so the error can be shown on the field.
create function public.username_available(p_username text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.profiles where username = lower(btrim(p_username)));
$$;

