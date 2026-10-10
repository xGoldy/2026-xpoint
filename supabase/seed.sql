-- SkillSwap seed data. Idempotent: every row has a deterministic id derived
-- from a readable key (md5(key)::uuid) and is inserted with ON CONFLICT DO NOTHING.
-- Dates are relative to the day the seed first runs, in Europe/Bratislava.
-- All seeded accounts use the password: skillswap123

-- Localities -----------------------------------------------------------------
insert into public.localities (id, name)
select md5('loc:' || name)::uuid, name
from (values ('Bratislava'), ('Trnava'), ('Nitra')) v(name)
on conflict do nothing;

-- Categories (A7) ------------------------------------------------------------
insert into public.categories (id, name)
select md5('cat:' || name)::uuid, name
from (values ('Sports'), ('Crafts'), ('Creative'), ('Languages'), ('Music'), ('Technology'), ('Cooking'), ('Other')) v(name)
on conflict do nothing;

-- Skills ---------------------------------------------------------------------
insert into public.skills (id, name, category_id)
select md5('skill:' || v.name)::uuid, v.name, md5('cat:' || v.category)::uuid
from (values
  ('Running', 'Sports'), ('Yoga', 'Sports'), ('Tennis', 'Sports'), ('Swimming', 'Sports'), ('Climbing', 'Sports'),
  ('Knitting', 'Crafts'), ('Woodworking', 'Crafts'), ('Pottery', 'Crafts'), ('Sewing', 'Crafts'), ('Bike repair', 'Crafts'),
  ('Drawing', 'Creative'), ('Watercolour painting', 'Creative'), ('Photography', 'Creative'), ('Creative writing', 'Creative'), ('Calligraphy', 'Creative'),
  ('Spanish', 'Languages'), ('English', 'Languages'), ('German', 'Languages'), ('French', 'Languages'), ('Italian', 'Languages'), ('Slovak', 'Languages'),
  ('Guitar', 'Music'), ('Piano', 'Music'), ('Singing', 'Music'), ('Ukulele', 'Music'), ('Drums', 'Music'),
  ('Python', 'Technology'), ('Web development', 'Technology'), ('Excel', 'Technology'), ('Smartphone basics', 'Technology'), ('3D printing', 'Technology'),
  ('Baking bread', 'Cooking'), ('Vegan cooking', 'Cooking'), ('Italian cooking', 'Cooking'), ('Fermentation', 'Cooking'), ('Coffee brewing', 'Cooking'),
  ('Gardening', 'Other'), ('Chess', 'Other'), ('First aid', 'Other'), ('Public speaking', 'Other'), ('Personal finance', 'Other')
) v(name, category)
on conflict do nothing;

-- Users ----------------------------------------------------------------------
drop table if exists pg_temp.seed_users;
create temp table seed_users (username text, first_name text, last_name text, locality text, email text, bio text);
insert into seed_users values
  ('alex_demo',  'Alex',     'Demo',      'Bratislava', 'demo@skillswap.test', 'Guitar player for 15 years, now finally learning Spanish. Happy to swap lessons.'),
  ('sam_new',    'Sam',      'Newcomer',  'Bratislava', 'new@skillswap.test',  ''),
  ('jana_k',     'Jana',     'Kováčová',  'Bratislava', 'jana_k@skillswap.test', 'Spanish teacher who spent six years in Valencia. Dreams of playing guitar.'),
  ('martin_h',   'Martin',   'Horváth',   'Bratislava', 'martin_h@skillswap.test', 'Runner and yoga lover. I organise park sessions every week.'),
  ('eva_n',      'Eva',      'Nováková',  'Bratislava', 'eva_n@skillswap.test', 'Knitting since childhood. My sewing machine is my best friend.'),
  ('peter_s',    'Peter',    'Szabó',     'Bratislava', 'peter_s@skillswap.test', 'Software developer. I like showing people that programming is not magic.'),
  ('lucia_b',    'Lucia',    'Balážová',  'Bratislava', 'lucia_b@skillswap.test', 'Physiotherapist and yoga instructor. Also coach shy speakers.'),
  ('tomas_v',    'Tomáš',    'Varga',     'Bratislava', 'tomas_v@skillswap.test', 'Session musician. Guitar, ukulele and anything with strings.'),
  ('zuzana_m',   'Zuzana',   'Molnárová', 'Bratislava', 'zuzana_m@skillswap.test', 'Home baker. My sourdough starter is eight years old.'),
  ('ivana_m',    'Ivana',    'Mészáros',  'Bratislava', 'ivana_m@skillswap.test', 'Grew up in Vienna, teach German over coffee.'),
  ('andrej_t',   'Andrej',   'Tóth',      'Trnava',     'andrej_t@skillswap.test', 'Language nerd. Spanish and grammar puzzles.'),
  ('katarina_p', 'Katarína', 'Poláková',  'Trnava',     'katarina_p@skillswap.test', 'Piano teacher and choir leader.'),
  ('michal_r',   'Michal',   'Rusnák',    'Trnava',     'michal_r@skillswap.test', 'Carpenter by trade, campfire guitarist by passion.'),
  ('simona_l',   'Simona',   'Lukáčová',  'Trnava',     'simona_l@skillswap.test', 'Photographer. I believe the best camera is the one in your pocket.'),
  ('jakub_d',    'Jakub',    'Dvořák',    'Trnava',     'jakub_d@skillswap.test', 'Data analyst. Python, spreadsheets and charts.'),
  ('veronika_c', 'Veronika', 'Čierna',    'Trnava',     'veronika_c@skillswap.test', 'Illustrator who paints watercolour landscapes on weekends.'),
  ('marek_f',    'Marek',    'Farkaš',    'Nitra',      'marek_f@skillswap.test', 'Club chess player, rated 2100.'),
  ('natalia_g',  'Natália',  'Gregorová', 'Nitra',      'natalia_g@skillswap.test', 'Lived in Seville and Bologna. Cooking and Spanish go together.'),
  ('lukas_k',    'Lukáš',    'Kollár',    'Nitra',      'lukas_k@skillswap.test', 'Web developer. I help small businesses get online.'),
  ('barbora_s',  'Barbora',  'Slobodová', 'Nitra',      'barbora_s@skillswap.test', 'Urban gardener. Tomatoes on every balcony!'),
  ('filip_z',    'Filip',    'Zeman',     'Nitra',      'filip_z@skillswap.test', 'Bike mechanic and weekend cyclist.'),
  ('roman_b',    'Roman',    'Bartoš',    'Nitra',      'roman_b@skillswap.test', 'Paramedic. Everyone should know basic first aid.');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', md5('user:' || u.username)::uuid, 'authenticated', 'authenticated',
  u.email, extensions.crypt('skillswap123', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object(
    'first_name', u.first_name, 'last_name', u.last_name, 'username', u.username,
    'locality_id', md5('loc:' || u.locality)::uuid
  ),
  now() - interval '90 days', now(),
  '', '', '', '', '', '', '', ''
from seed_users u
on conflict do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  md5('identity:' || u.username)::uuid, md5('user:' || u.username)::uuid, md5('user:' || u.username)::uuid::text, 'email',
  jsonb_build_object('sub', md5('user:' || u.username)::uuid::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from seed_users u
on conflict do nothing;

-- Profiles are created by the on_auth_user_created trigger; add the bios.
update public.profiles p set bio = u.bio
from seed_users u
where p.id = md5('user:' || u.username)::uuid and p.bio = '' and u.bio <> '';

-- Skills each user can teach and wants to learn ------------------------------
insert into public.user_skills (id, user_id, skill_id, role, level)
select md5('us:' || v.username || ':' || v.skill || ':' || v.role)::uuid,
       md5('user:' || v.username)::uuid, md5('skill:' || v.skill)::uuid, v.role, v.level
from (values
  ('alex_demo', 'Guitar', 'teach', 'advanced'), ('alex_demo', 'Spanish', 'learn', 'beginner'), ('alex_demo', 'Yoga', 'learn', 'beginner'),
  ('jana_k', 'Spanish', 'teach', 'advanced'), ('jana_k', 'English', 'teach', 'advanced'), ('jana_k', 'Guitar', 'learn', 'beginner'), ('jana_k', 'Web development', 'learn', 'beginner'),
  ('martin_h', 'Yoga', 'teach', 'advanced'), ('martin_h', 'Running', 'teach', 'advanced'), ('martin_h', 'Spanish', 'learn', 'beginner'), ('martin_h', 'Baking bread', 'learn', 'beginner'),
  ('eva_n', 'Knitting', 'teach', 'advanced'), ('eva_n', 'Sewing', 'teach', 'intermediate'), ('eva_n', 'Yoga', 'learn', 'beginner'), ('eva_n', 'Guitar', 'learn', 'beginner'),
  ('peter_s', 'Python', 'teach', 'advanced'), ('peter_s', 'Excel', 'teach', 'advanced'), ('peter_s', 'Spanish', 'learn', 'intermediate'), ('peter_s', 'Baking bread', 'learn', 'beginner'),
  ('lucia_b', 'Yoga', 'teach', 'advanced'), ('lucia_b', 'Public speaking', 'teach', 'advanced'), ('lucia_b', 'Python', 'learn', 'beginner'), ('lucia_b', 'Knitting', 'learn', 'beginner'),
  ('tomas_v', 'Guitar', 'teach', 'advanced'), ('tomas_v', 'Ukulele', 'teach', 'advanced'), ('tomas_v', 'Web development', 'learn', 'beginner'), ('tomas_v', 'German', 'learn', 'intermediate'),
  ('zuzana_m', 'Baking bread', 'teach', 'advanced'), ('zuzana_m', 'Fermentation', 'teach', 'intermediate'), ('zuzana_m', 'Spanish', 'learn', 'beginner'), ('zuzana_m', 'Sewing', 'learn', 'beginner'),
  ('ivana_m', 'German', 'teach', 'advanced'), ('ivana_m', 'Coffee brewing', 'teach', 'intermediate'), ('ivana_m', 'Yoga', 'learn', 'intermediate'), ('ivana_m', 'Guitar', 'learn', 'beginner'),
  ('andrej_t', 'Spanish', 'teach', 'advanced'), ('andrej_t', 'French', 'teach', 'intermediate'), ('andrej_t', 'Python', 'learn', 'beginner'), ('andrej_t', 'Guitar', 'learn', 'intermediate'),
  ('katarina_p', 'Piano', 'teach', 'advanced'), ('katarina_p', 'Singing', 'teach', 'advanced'), ('katarina_p', 'English', 'learn', 'intermediate'), ('katarina_p', 'Photography', 'learn', 'beginner'),
  ('michal_r', 'Guitar', 'teach', 'intermediate'), ('michal_r', 'Woodworking', 'teach', 'advanced'), ('michal_r', 'Piano', 'learn', 'beginner'), ('michal_r', 'Spanish', 'learn', 'beginner'),
  ('simona_l', 'Photography', 'teach', 'advanced'), ('simona_l', 'Drawing', 'teach', 'intermediate'), ('simona_l', 'Python', 'learn', 'beginner'), ('simona_l', 'Guitar', 'learn', 'beginner'),
  ('jakub_d', 'Python', 'teach', 'advanced'), ('jakub_d', 'Excel', 'teach', 'advanced'), ('jakub_d', 'Chess', 'learn', 'intermediate'), ('jakub_d', 'Spanish', 'learn', 'beginner'),
  ('veronika_c', 'Watercolour painting', 'teach', 'advanced'), ('veronika_c', 'Calligraphy', 'teach', 'intermediate'), ('veronika_c', 'Piano', 'learn', 'beginner'), ('veronika_c', 'Yoga', 'learn', 'beginner'),
  ('marek_f', 'Chess', 'teach', 'advanced'), ('marek_f', 'Personal finance', 'teach', 'intermediate'), ('marek_f', 'Spanish', 'learn', 'beginner'), ('marek_f', 'Guitar', 'learn', 'beginner'),
  ('natalia_g', 'Spanish', 'teach', 'advanced'), ('natalia_g', 'Italian cooking', 'teach', 'advanced'), ('natalia_g', 'Chess', 'learn', 'beginner'), ('natalia_g', 'Gardening', 'learn', 'beginner'),
  ('lukas_k', 'Web development', 'teach', 'advanced'), ('lukas_k', '3D printing', 'teach', 'intermediate'), ('lukas_k', 'Guitar', 'learn', 'intermediate'), ('lukas_k', 'Swimming', 'learn', 'beginner'),
  ('barbora_s', 'Gardening', 'teach', 'advanced'), ('barbora_s', 'Vegan cooking', 'teach', 'intermediate'), ('barbora_s', 'Piano', 'learn', 'beginner'), ('barbora_s', 'Italian cooking', 'learn', 'beginner'),
  ('filip_z', 'Bike repair', 'teach', 'advanced'), ('filip_z', 'Swimming', 'teach', 'intermediate'), ('filip_z', 'Python', 'learn', 'intermediate'), ('filip_z', 'Spanish', 'learn', 'beginner'),
  ('roman_b', 'First aid', 'teach', 'advanced'), ('roman_b', 'Tennis', 'teach', 'intermediate'), ('roman_b', 'Excel', 'learn', 'beginner'), ('roman_b', 'Piano', 'learn', 'beginner')
) v(username, skill, role, level)
on conflict do nothing;

-- Weekly availability (Monday = 0), times in Europe/Bratislava ---------------
insert into public.availability_slots (id, user_id, weekday, start_time, end_time)
select md5('slot:' || a.username || ':' || p.weekday)::uuid, md5('user:' || a.username)::uuid, p.weekday, p.start_time, p.end_time
from (values
  -- E: weekday evenings
  ('E', 0, time '17:00', time '21:00'), ('E', 1, '17:00', '21:00'), ('E', 2, '17:00', '21:00'), ('E', 3, '17:00', '21:00'),
  -- M: early mornings and Saturday morning
  ('M', 0, '06:30', '09:00'), ('M', 1, '06:30', '09:00'), ('M', 2, '06:30', '09:00'), ('M', 3, '06:30', '09:00'), ('M', 4, '06:30', '09:00'), ('M', 5, '08:00', '12:00'),
  -- W: weekends
  ('W', 5, '09:00', '18:00'), ('W', 6, '10:00', '17:00'),
  -- X: mixed evenings and Saturday
  ('X', 1, '18:00', '21:30'), ('X', 3, '18:00', '21:30'), ('X', 5, '09:00', '13:00'),
  -- D: weekday daytime
  ('D', 0, '09:00', '16:00'), ('D', 1, '09:00', '16:00'), ('D', 2, '09:00', '16:00'), ('D', 3, '09:00', '16:00'), ('D', 4, '09:00', '16:00')
) p(pattern, weekday, start_time, end_time)
join (values
  ('alex_demo', 'X'), ('jana_k', 'X'), ('martin_h', 'M'), ('eva_n', 'W'), ('peter_s', 'E'), ('lucia_b', 'D'),
  ('tomas_v', 'E'), ('zuzana_m', 'W'), ('ivana_m', 'E'), ('andrej_t', 'E'), ('katarina_p', 'D'), ('michal_r', 'X'),
  ('simona_l', 'W'), ('jakub_d', 'E'), ('veronika_c', 'W'), ('marek_f', 'X'), ('natalia_g', 'E'), ('lukas_k', 'E'),
  ('barbora_s', 'D'), ('filip_z', 'W'), ('roman_b', 'X')
) a(username, pattern) on a.pattern = p.pattern
on conflict do nothing;

-- Offers ---------------------------------------------------------------------
-- first_day / start_at: when the first class session starts (days from today, local time).
drop table if exists pg_temp.seed_offers;
create temp table seed_offers (
  key text, teacher text, skill text, title text, description text, format text, level text,
  session_count int, duration int, mode text, locality text, max_participants int,
  first_day int, start_at time, age_days int
);
insert into seed_offers values
  ('o01', 'jana_k', 'Spanish', 'Conversational Spanish for beginners', 'Relaxed conversation practice in a café near Hlavné námestie. We start with greetings and ordering food, and you will hold a short conversation by the third session.', 'one_to_one', 'beginner', 6, 60, 'in_person', 'Bratislava', 1, null, null, 80),
  ('o02', 'andrej_t', 'Spanish', 'Spanish grammar online', 'A small online group working through the past tenses and the subjunctive with plenty of exercises. Bring a notebook.', 'class', 'intermediate', 8, 90, 'online', null, 6, 3, '18:00', 40),
  ('o03', 'natalia_g', 'Spanish', 'Spanish through cooking', 'We cook a Spanish dish together and only speak Spanish while doing it. Ingredients are shared.', 'class', 'all', 4, 120, 'in_person', 'Nitra', 8, 5, '17:00', 30),
  ('o04', 'martin_h', 'Yoga', 'Morning yoga in the park', 'Gentle morning flow in Sad Janka Kráľa. Bring a mat and water; all bodies welcome.', 'class', 'all', 6, 60, 'in_person', 'Bratislava', 12, 2, '07:30', 60),
  ('o05', 'lucia_b', 'Yoga', 'Yoga for a healthy back', 'One-to-one sessions designed by a physiotherapist for people who sit all day.', 'one_to_one', 'beginner', 4, 60, 'online', null, 1, null, null, 75),
  ('o06', 'alex_demo', 'Guitar', 'Guitar basics: your first chords', 'Learn the five chords that unlock hundreds of songs. I have a spare guitar if you do not own one yet.', 'one_to_one', 'beginner', 5, 60, 'in_person', 'Bratislava', 1, null, null, 70),
  ('o07', 'tomas_v', 'Guitar', 'Fingerstyle guitar', 'For players who know their chords and want to play melody and bass at once.', 'one_to_one', 'advanced', 8, 60, 'in_person', 'Bratislava', 1, null, null, 65),
  ('o08', 'michal_r', 'Guitar', 'Campfire guitar class', 'Strum along to Slovak and English classics. Tuners and picks provided.', 'class', 'beginner', 4, 90, 'in_person', 'Trnava', 6, 4, '18:30', 20),
  ('o09', 'eva_n', 'Knitting', 'Knit your first scarf', 'Four Saturday mornings, one finished scarf. Yarn and needles included.', 'class', 'beginner', 4, 120, 'in_person', 'Bratislava', 8, 6, '10:00', 25),
  ('o10', 'peter_s', 'Python', 'Python from zero', 'An evening course for complete beginners: variables, loops, functions and a small project at the end.', 'class', 'beginner', 6, 90, 'online', null, 15, 1, '19:00', 35),
  ('o11', 'jakub_d', 'Python', 'Python for data analysis', 'Pandas, charts and cleaning messy spreadsheets, using your own data if you like.', 'one_to_one', 'intermediate', 4, 60, 'online', null, 1, null, null, 85),
  ('o12', 'zuzana_m', 'Baking bread', 'Sourdough bread at home', 'Make a starter, shape a loaf and take home a jar of my eight-year-old starter.', 'class', 'all', 2, 180, 'in_person', 'Bratislava', 4, 8, '09:00', 15),
  ('o13', 'katarina_p', 'Piano', 'Piano for adult beginners', 'It is never too late. We start with reading simple notes and playing with both hands.', 'one_to_one', 'beginner', 10, 45, 'in_person', 'Trnava', 1, null, null, 88),
  ('o14', 'simona_l', 'Photography', 'Smartphone photography walk', 'A walk through Trnava''s old town learning composition and light with the phone you already have.', 'class', 'all', 3, 120, 'in_person', 'Trnava', 10, 5, '15:00', 22),
  ('o15', 'marek_f', 'Chess', 'Chess openings that work', 'Understand the ideas behind three solid openings instead of memorising moves.', 'one_to_one', 'intermediate', 5, 60, 'online', null, 1, null, null, 60),
  ('o16', 'barbora_s', 'Gardening', 'Balcony vegetable garden', 'Grow tomatoes, herbs and salad on a balcony. Seeds to take home.', 'class', 'beginner', 3, 90, 'in_person', 'Nitra', 8, 3, '16:00', 18),
  ('o17', 'filip_z', 'Bike repair', 'Fix your own bike', 'Punctures, brakes and gears. Bring your bike; tools are provided.', 'class', 'beginner', 2, 120, 'in_person', 'Nitra', 6, 9, '10:00', 12),
  ('o18', 'ivana_m', 'German', 'German conversation club', 'Weekly conversation over coffee on everyday topics. Some German needed.', 'class', 'intermediate', 8, 60, 'in_person', 'Bratislava', 8, 2, '18:00', 45),
  ('o19', 'roman_b', 'First aid', 'First aid essentials', 'CPR, recovery position and what to do until the ambulance arrives. Practice on mannequins.', 'class', 'all', 1, 240, 'in_person', 'Nitra', 20, 11, '09:00', 10),
  ('o20', 'veronika_c', 'Watercolour painting', 'Watercolour landscapes', 'Washes, wet-on-wet and simple landscapes. Paper and paints provided.', 'class', 'beginner', 4, 120, 'in_person', 'Trnava', 6, 6, '14:00', 28),
  ('o21', 'lukas_k', 'Web development', 'Build your first website', 'HTML and CSS step by step, finishing with your own page online.', 'one_to_one', 'beginner', 6, 90, 'online', null, 1, null, null, 82),
  ('o22', 'jana_k', 'English', 'English for job interviews', 'Mock interviews and feedback for advanced speakers.', 'one_to_one', 'advanced', 3, 60, 'online', null, 1, null, null, 50),
  ('o23', 'martin_h', 'Running', 'Couch to 5K group', 'From walking to running 5 km in eight weeks, together.', 'class', 'beginner', 8, 45, 'in_person', 'Bratislava', 15, 1, '07:00', 33),
  ('o24', 'eva_n', 'Sewing', 'Sewing machine basics', 'Thread the machine, sew straight lines and make a tote bag.', 'one_to_one', 'beginner', 3, 90, 'in_person', 'Bratislava', 1, null, null, 77),
  ('o25', 'peter_s', 'Excel', 'Excel for everyday life', 'Budgets, lists and formulas that save time at home and at work.', 'one_to_one', 'intermediate', 3, 60, 'online', null, 1, null, null, 72),
  ('o26', 'natalia_g', 'Italian cooking', 'Fresh pasta by hand', 'Tagliatelle and ravioli from flour and eggs, no machine needed.', 'class', 'all', 2, 150, 'in_person', 'Nitra', 8, 7, '17:00', 14),
  ('o27', 'tomas_v', 'Ukulele', 'Ukulele in a week', 'Four short online lessons and you will play your first songs.', 'class', 'beginner', 4, 60, 'online', null, 10, 2, '19:30', 9),
  ('o28', 'lucia_b', 'Public speaking', 'Speak with confidence', 'Practice short talks in a safe setting and get specific, kind feedback.', 'one_to_one', 'intermediate', 4, 60, 'in_person', 'Bratislava', 1, null, null, 68),
  ('o29', 'michal_r', 'Woodworking', 'Woodworking for beginners', 'Hand tools, safe technique and a small shelf to take home.', 'class', 'beginner', 5, 180, 'in_person', 'Trnava', 5, 10, '09:00', 8),
  ('o30', 'katarina_p', 'Singing', 'Choir warm-ups for everyone', 'Breathing, warm-ups and simple songs in harmony. No experience needed.', 'class', 'all', 6, 60, 'in_person', 'Trnava', 20, 4, '18:00', 26);

insert into public.offers (
  id, teacher_id, skill_id, title, description, format, level, session_count, session_duration_min,
  mode, locality_id, max_participants, created_at
)
select md5('offer:' || o.key)::uuid, md5('user:' || o.teacher)::uuid, md5('skill:' || o.skill)::uuid,
       o.title, o.description, o.format, o.level, o.session_count, o.duration, o.mode,
       case when o.locality is not null then md5('loc:' || o.locality)::uuid end,
       o.max_participants, now() - make_interval(days => o.age_days)
from seed_offers o
on conflict do nothing;

-- Weekly class sessions starting first_day days from today.
insert into public.sessions (id, offer_id, sequence_no, starts_at, ends_at)
select md5('session:' || o.key || ':' || n)::uuid, md5('offer:' || o.key)::uuid, n, t.starts_at,
       t.starts_at + make_interval(mins => o.duration)
from seed_offers o
cross join lateral generate_series(1, o.session_count) n
cross join lateral (
  select ((date_trunc('day', now() at time zone 'Europe/Bratislava')
           + make_interval(days => o.first_day + (n - 1) * 7) + o.start_at)
          at time zone 'Europe/Bratislava') as starts_at
) t
where o.format = 'class'
on conflict do nothing;

-- Bookings -------------------------------------------------------------------
-- Completed 1:1 bookings with one past session each, and their ratings.
drop table if exists pg_temp.seed_done;
create temp table seed_done (key text, offer text, learner text, days_ago int, points int, comment text);
insert into seed_done values
  ('d01', 'o01', 'peter_s', 40, 5, 'Jana makes every lesson fun. I ordered dinner in Spanish last week!'),
  ('d02', 'o01', 'zuzana_m', 30, 4, 'Patient and well prepared.'),
  ('d03', 'o01', 'alex_demo', 21, 5, 'Exactly the push I needed to start speaking.'),
  ('d04', 'o05', 'martin_h', 50, 5, 'My back has never felt better.'),
  ('d05', 'o05', 'eva_n', 35, 5, ''),
  ('d06', 'o05', 'ivana_m', 20, 4, 'Clear explanations, good pace.'),
  ('d07', 'o07', 'lukas_k', 25, 4, 'Challenging in a good way.'),
  ('d08', 'o11', 'simona_l', 45, 5, 'Finally understand pandas.'),
  ('d09', 'o11', 'andrej_t', 38, 3, ''),
  ('d10', 'o11', 'filip_z', 15, 4, 'Very practical.'),
  ('d11', 'o13', 'barbora_s', 60, 5, 'Katarína is a wonderful teacher.'),
  ('d12', 'o13', 'roman_b', 48, 4, ''),
  ('d13', 'o13', 'michal_r', 33, 5, 'I can play a whole song now.'),
  ('d14', 'o13', 'veronika_c', 18, 5, 'Warm and encouraging.'),
  ('d15', 'o15', 'natalia_g', 29, 2, 'Too fast for me.'),
  ('d16', 'o15', 'jakub_d', 12, 3, ''),
  ('d17', 'o21', 'jana_k', 27, 5, 'My website is live!'),
  ('d18', 'o06', 'eva_n', 32, 5, 'Alex is so patient, I play three songs already.'),
  ('d19', 'o06', 'ivana_m', 16, 4, 'Great first steps.'),
  ('d20', 'o22', 'katarina_p', 22, 4, 'Helped me get the job.'),
  ('d21', 'o24', 'zuzana_m', 26, 5, 'Made my first tote bag.'),
  ('d22', 'o25', 'roman_b', 19, 3, ''),
  ('d23', 'o28', 'alex_demo', 9, null, null);

insert into public.bookings (id, offer_id, learner_id, initiated_by, status, proposed_starts_at, message, created_at, updated_at)
select md5('booking:' || d.key)::uuid, md5('offer:' || d.offer)::uuid, md5('user:' || d.learner)::uuid, 'learner', 'completed',
       t.starts_at, '', t.starts_at - interval '5 days', t.starts_at + interval '2 days'
from seed_done d
cross join lateral (
  select ((date_trunc('day', now() at time zone 'Europe/Bratislava') - make_interval(days => d.days_ago) + time '18:00')
          at time zone 'Europe/Bratislava') as starts_at
) t
on conflict do nothing;

insert into public.sessions (id, offer_id, booking_id, sequence_no, starts_at, ends_at, status)
select md5('bsession:' || d.key)::uuid, b.offer_id, b.id, 1, b.proposed_starts_at,
       b.proposed_starts_at + make_interval(mins => o.session_duration_min), 'completed'
from seed_done d
join public.bookings b on b.id = md5('booking:' || d.key)::uuid
join public.offers o on o.id = b.offer_id
on conflict do nothing;

insert into public.ratings (id, booking_id, teacher_id, learner_id, points, comment, created_at)
select md5('rating:' || d.key)::uuid, md5('booking:' || d.key)::uuid, o.teacher_id, md5('user:' || d.learner)::uuid,
       d.points, d.comment, b.updated_at
from seed_done d
join public.bookings b on b.id = md5('booking:' || d.key)::uuid
join public.offers o on o.id = b.offer_id
where d.points is not null
on conflict do nothing;

-- Accepted class seats; the sourdough class (o12) is full.
insert into public.bookings (id, offer_id, learner_id, initiated_by, status, message, created_at)
select md5('booking:' || v.offer || ':' || v.learner)::uuid, md5('offer:' || v.offer)::uuid, md5('user:' || v.learner)::uuid,
       'learner', 'accepted', '', now() - interval '3 days'
from (values
  ('o12', 'jana_k'), ('o12', 'peter_s'), ('o12', 'lucia_b'), ('o12', 'ivana_m'),
  ('o04', 'alex_demo'), ('o04', 'eva_n'), ('o04', 'ivana_m'), ('o04', 'veronika_c'),
  ('o02', 'jakub_d'), ('o02', 'michal_r'),
  ('o10', 'lucia_b'), ('o10', 'simona_l'), ('o10', 'andrej_t'),
  ('o23', 'zuzana_m'), ('o09', 'lucia_b'), ('o18', 'tomas_v'), ('o14', 'katarina_p'),
  ('o08', 'andrej_t'), ('o26', 'barbora_s'), ('o30', 'michal_r')
) v(offer, learner)
on conflict do nothing;

-- Open requests and invitations involving the demo account.
insert into public.bookings (id, offer_id, learner_id, initiated_by, status, proposed_starts_at, message, created_at)
select md5('booking:' || v.key)::uuid, md5('offer:' || v.offer)::uuid, md5('user:' || v.learner)::uuid,
       v.initiated_by, 'pending',
       case when v.days_ahead is not null then
         ((date_trunc('day', now() at time zone 'Europe/Bratislava') + make_interval(days => v.days_ahead) + time '18:30')
          at time zone 'Europe/Bratislava')
       end,
       v.message, now() - interval '1 day'
from (values
  ('p01', 'o06', 'jana_k', 'learner', 4, 'Hi Alex! I would love to learn guitar. Happy to help with your Spanish in return.'),
  ('p02', 'o23', 'alex_demo', 'teacher', null, 'Saw you like yoga mornings. Want to join our running group?'),
  ('p03', 'o06', 'marek_f', 'learner', 6, 'Total beginner here, evenings work best for me.')
) v(key, offer, learner, initiated_by, days_ahead, message)
on conflict do nothing;
