# SkillSwap — Product Specification

Oct 10, 2026 · @Patrik

## 1. Overview

SkillSwap is a responsive web app where members of a local community find someone who can teach a skill they want to learn, book a session, and rate the teacher afterwards. Every user can both teach and learn; there are no separate teacher and learner accounts.

This document is a product requirements document for a coding agent. Requirement IDs (for example `MATCH-2`) are stable and can be referenced in prompts.

**Decisions already made**

| Topic | Decision |
| --- | --- |
| Consumer of this spec | A coding agent working in a repository (Claude Code, Cursor or similar) |
| Backend | Real authentication and a real database; no mock-only screens in the core flow |
| Points | Reputation only: learners award points to teachers; points cannot be spent |
| Matching | Deterministic rule-based score; the explanation lists the factors that produced it |

**Build time is one hour.** Section 9 defines the one-hour cut and overrides Sections 4 to 8 wherever they differ. Those sections describe the full product and stay as the reference for work after the hackathon.

**In scope for the full product**

- Registration, login, profile with skills and weekly availability
- Skill catalogue with search by name and by category
- Teaching offers (1:1 or class) with scheduled sessions
- Session requests and invitations, with accept and decline
- Ranked matching with a visible explanation
- Points for teachers after a completed session
- History of sessions taught and attended

**Out of scope**

- Payments, spendable points, or any currency
- Chat or direct messaging between users
- Email delivery and external calendar sync (Google, Outlook)
- Maps, GPS geolocation, distance in kilometres
- Admin panel, content moderation, reporting
- Native mobile apps, multiple UI languages

## 2. Assumptions and open questions

The original notes left these points undefined. Each row is a default chosen so the spec is buildable; change any row and the affected requirement IDs are listed beside it.

| # | Topic | Default used in this spec | Affects |
| --- | --- | --- | --- |
| A1 | Tech stack | Vite and React single-page app with TypeScript, Tailwind CSS and React Router; Supabase for Auth, Postgres and row-level security; no server code | Sections 4, 8, 9 |
| A2 | Skills at registration | Two multiselects: skills I can teach, skills I want to learn. The original listed one undifferentiated multiselect | AUTH-1, MATCH-3 |
| A3 | "People in the area" | Each user picks a locality (city or town) from a seeded list. Same locality counts as nearby. No GPS, no radius | AUTH-1, HOME-2, MATCH-3 |
| A4 | Delivery mode | Each offer is in person or online. Not in the original notes; needed for the location factor to make sense | OFFER-1, MATCH-3 |
| A5 | Calendar invitation | An in-app invitation with accept and decline, plus a downloadable `.ics` file for accepted sessions. No email is sent | BOOK-4, BOOK-6 |
| A6 | Adding a skill | Any logged-in user can add a skill to the catalogue (name and category). Names are unique, case-insensitive. No approval step | SKILL-4 |
| A7 | Categories | Sports, Crafts, Creative, Languages, Music, Technology, Cooking, Other | SKILL-2 |
| A8 | Points scale | 1 to 5 points, once per completed booking, with an optional comment | RATE-1 |
| A9 | Class capacity | Each class offer has a maximum number of participants; a full class cannot be requested | OFFER-1, BOOK-2 |
| A10 | Time zone | Stored in UTC, displayed in Europe/Bratislava for all users | Section 8 |
| A11 | Email verification | Disabled, so a judge can register and use the app immediately | AUTH-2 |
| A12 | UI language | English only | Section 8 |

**Resolved by questionnaire**

| Question | Answer | Effect |
| --- | --- | --- |
| Build hours | One hour | Scope cut to a single path; see Section 9 |
| Skills at registration | Teach and learn lists | A2 confirmed |
| Judging criteria | Working end-to-end demo, explainable matching, UX and accessibility, community impact | Each is tied to a concrete action in Section 9 |
| Tech stack | Free choice, simpler option | A1 changed to a Vite and React single-page app with Supabase |

**Open questions**

- [ ] Can the Supabase project and an empty repository be prepared before the clock starts? The time plan in Section 9 assumes yes; if not, the first block needs about 8 more minutes.

## 3. Core concepts

The original notes used "skill" for three different things: the subject, a teacher's offer to teach it, and a dated class. This spec uses one term for each, and code, database and UI copy must follow it.

| Term | Meaning | Original wording |
| --- | --- | --- |
| Skill | A subject in the shared catalogue, for example "Spanish" or "Knitting". Belongs to one category | "skill" |
| Offer | One teacher's offer to teach one skill: format, level, description, number of sessions, mode | "creation of a new skill of teaching" |
| Session | One dated occurrence of an offer, with a start and end time | "calendar of skills classes" |
| Booking | The link between a learner and an offer, with a status. Created by a learner's request or a teacher's invitation | "request a session", "calendar invitation" |
| Availability | A user's recurring weekly time slots, used for both teaching and learning | "specify availability" |
| Points | A 1 to 5 score a learner gives the teacher after a completed booking | "give points to the teacher" |
| Teacher / learner | Roles a user plays in a given booking, not account types |  |

**Booking lifecycle**

1. `pending`: created by a learner (request) or by a teacher (invitation).
2. `accepted` or `declined`: set by the other party. Only the party that did not create the booking can accept or decline.
3. `cancelled`: either party can cancel a pending or accepted booking before the first session starts.
4. `completed`: the teacher marks the booking completed after the last session's end time. Only a completed booking can receive points.

## 4. Data model

Ten tables in Postgres. All tables have `id uuid` primary key and `created_at timestamptz` unless stated; all timestamps are UTC.

| Table | Fields | Constraints |
| --- | --- | --- |
| `profiles` | `id` (same as auth user id), `first_name`, `last_name`, `username`, `locality_id`, `bio` | `username` unique, 3 to 30 characters, lowercase letters, digits, underscore |
| `localities` | `name` | Unique; seeded, not user-editable |
| `categories` | `name` | Unique; seeded (see A7) |
| `skills` | `name`, `category_id`, `created_by` | `lower(name)` unique |
| `user_skills` | `user_id`, `skill_id`, `role` (`teach`, `learn`), `level` (`beginner`, `intermediate`, `advanced`) | Unique on (`user_id`, `skill_id`, `role`) |
| `availability_slots` | `user_id`, `weekday` (0 to 6, Monday is 0), `start_time`, `end_time` | `end_time` after `start_time`; no overlapping slots per user and weekday |
| `offers` | `teacher_id`, `skill_id`, `title`, `description`, `format` (`one_to_one`, `class`), `level` (`beginner`, `intermediate`, `advanced`, `all`), `session_count`, `session_duration_min`, `mode` (`in_person`, `online`), `locality_id`, `max_participants`, `status` (`active`, `archived`) | `session_count` 1 to 20; `max_participants` required for `class`, fixed at 1 for `one_to_one`; `locality_id` required for `in_person` |
| `sessions` | `offer_id`, `booking_id` (nullable), `sequence_no`, `starts_at`, `ends_at`, `status` (`scheduled`, `completed`, `cancelled`) | `booking_id` set only for 1:1 sessions; unique on (`offer_id`, `booking_id`, `sequence_no`) |
| `bookings` | `offer_id`, `learner_id`, `initiated_by` (`learner`, `teacher`), `status` (`pending`, `accepted`, `declined`, `cancelled`, `completed`), `proposed_starts_at` (1:1 only), `message` | At most one booking in `pending` or `accepted` per (`offer_id`, `learner_id`); learner cannot be the offer's teacher |
| `ratings` | `booking_id`, `teacher_id`, `learner_id`, `points` (1 to 5), `comment` | `booking_id` unique; booking must be `completed` |

**How sessions are created**

- Class offer: the teacher enters all `session_count` session dates when creating the offer. Sessions have no `booking_id` and are shared by all accepted learners.
- 1:1 offer: no sessions exist until a booking is accepted. On acceptance the app creates the first session at `proposed_starts_at`, linked to that booking. The teacher adds later sessions from the booking page.

**Derived values, not stored**

- Teacher points total: sum of `ratings.points` for the teacher. Rating count and average come from the same rows.
- Seats left on a class: `max_participants` minus accepted bookings.
- Notifications: the pending bookings where the current user is the party who must respond. No separate notifications table.

## 5. Functional requirements

Each requirement is written so it can be checked: a requirement is done when the stated behaviour can be demonstrated in the running app.

### Registration and login

| ID | Requirement |
| --- | --- |
| AUTH-1 | Registration collects first name, surname, username, email, password, locality, skills I can teach (multiselect, optional) and skills I want to learn (multiselect, optional) |
| AUTH-2 | After a successful registration the user is logged in and lands on the home page; no email confirmation step |
| AUTH-3 | Duplicate username or email shows an inline error on the field, and no account is created |
| AUTH-4 | Login by email and password; logout from the account menu |
| AUTH-5 | Pages under `/account`, `/offers/new` and `/match` redirect logged-out users to login and return them afterwards |

### Home page

| ID | Requirement |
| --- | --- |
| HOME-1 | A search box that goes to the skill search results (SKILL-1) |
| HOME-2 | Logged in: up to 8 skills with active offers in the user's locality, and up to 8 teachers from that locality ordered by points total |
| HOME-3 | Logged out: the same two lists across all localities, plus a call to action to register |
| HOME-4 | A row of category tiles; each links to the search filtered by that category |

### Skill search and skill page

| ID | Requirement |
| --- | --- |
| SKILL-1 | Search by name: case-insensitive substring match on the skill name, results update as the user types |
| SKILL-2 | Filter by category, combinable with the name search |
| SKILL-3 | Each result shows the skill name, category, number of active offers and number of teachers |
| SKILL-4 | "Add a skill" form (name, category) for logged-in users. An existing name shows a link to the existing skill instead of creating a duplicate |
| SKILL-5 | Skill page lists teachers with an active offer: name, locality, points total, rating count, offer format and level. Each row links to the offer |
| SKILL-6 | Skill page shows upcoming class sessions for that skill as a chronological agenda grouped by day, each entry linking to its offer |
| SKILL-7 | Skill page has a "Find my best match" button that opens matching for that skill (MATCH-1) |

### Offers

| ID | Requirement |
| --- | --- |
| OFFER-1 | Create an offer with: skill, title, description, format (1:1 or class), level, number of sessions, session duration, mode (in person or online), locality when in person, maximum participants when class |
| OFFER-2 | For a class, the form requires a start date and time for every session; the number of rows follows the number of sessions |
| OFFER-3 | Creating an offer for a skill adds that skill to the teacher's "can teach" list if it is missing |
| OFFER-4 | The teacher can edit the description and archive the offer. An archived offer disappears from search and matching but stays in history |
| OFFER-5 | Offer page shows all offer fields, the teacher's points, seats left for a class, the session dates, and the action available to the viewer (request, pending, accepted, or manage for the owner) |

### Bookings and invitations

| ID | Requirement |
| --- | --- |
| BOOK-1 | A learner requests a 1:1 offer by proposing a start time for the first session and an optional message. The time picker highlights times where both users' availability overlaps |
| BOOK-2 | A learner requests to join a class with an optional message. The button is disabled when no seats are left |
| BOOK-3 | The teacher sees incoming requests and can accept or decline each |
| BOOK-4 | A teacher can invite a user to one of their offers from that user's public profile. The invited user can accept or decline |
| BOOK-5 | Either party can cancel a pending or accepted booking before the first session starts |
| BOOK-6 | An accepted booking shows a "Download calendar file" action that produces a valid `.ics` file containing all its sessions |
| BOOK-7 | The header shows a badge with the number of pending bookings awaiting the current user's response |
| BOOK-8 | The teacher can mark a booking completed once the last session's end time has passed |

### Points

| ID | Requirement |
| --- | --- |
| RATE-1 | The learner of a completed booking can give 1 to 5 points and an optional comment, once. The form is hidden after submission |
| RATE-2 | A teacher's points total and rating count appear on their public profile, on offer pages and in teacher lists |
| RATE-3 | A user cannot rate themselves or a booking they were not the learner of; this is enforced in the database, not only in the UI |

### Account

| ID | Requirement |
| --- | --- |
| ACC-1 | Edit first name, surname, locality and bio. Username and email are read-only |
| ACC-2 | Manage the "can teach" and "want to learn" skill lists, each entry with a level |
| ACC-3 | Manage weekly availability: add and remove time slots per weekday. One availability set serves both teaching and learning |
| ACC-4 | "My offers" lists the user's offers with status and number of accepted learners |
| ACC-5 | "My sessions" has three tabs: Upcoming, Requests, History. History is split into Taught and Learned, each row showing the skill, the other party, dates, status and points given |
| ACC-6 | Public profile at `/users/:username` shows name, locality, bio, skills taught, active offers and points. It never shows the email address |

## 6. Matching

Matching ranks the active offers for one skill for the logged-in learner with a score from 0 to 100, the weighted sum of five factors. The same factor values that produce the score produce the explanation, so the explanation can never disagree with the ranking.

| ID | Requirement |
| --- | --- |
| MATCH-1 | Input: one skill (required), plus optional filters for format (1:1, class) and mode (in person, online) |
| MATCH-2 | Candidates: active offers for that skill, excluding the learner's own offers, full classes, and offers the learner already has a pending or accepted booking for |
| MATCH-3 | Each candidate is scored with the five factors below; results are sorted by score, descending |
| MATCH-4 | Ties are broken by teacher points total, then by earliest upcoming session, then by offer creation date |
| MATCH-5 | Each result card shows the score and the three factors with the highest contribution as short reasons |
| MATCH-6 | "Why this match?" expands the card to all five factors, each with its weight, its value and its reason text |
| MATCH-7 | The scoring logic is one pure function with no database access, covered by unit tests for every factor and for tie-breaking |

**Factors**

| Factor | Weight | Value between 0 and 1 |
| --- | --- | --- |
| Availability | 30 | Class: share of the offer's future sessions that fall fully inside the learner's availability. 1:1: overlapping weekly minutes between teacher and learner, divided by twice the session duration, capped at 1 |
| Level | 25 | 1 when the offer level equals the learner's level for this skill or the offer is for all levels; 0.5 when one step apart; 0 when two steps apart. A learner with no level set is treated as a beginner |
| Location | 20 | 1 when the offer is online or in the learner's locality; 0 otherwise |
| Reputation | 15 | Damped average of the teacher's points, divided by 5 (formula below) |
| Mutual swap | 10 | 1 when the teacher wants to learn at least one skill the learner can teach; 0 otherwise |

```latex
\text{score} = 30\,a + 25\,l + 20\,d + 15\,r + 10\,m, \qquad r = \frac{1}{5}\cdot\frac{P + 3 \cdot 3.5}{n + 3}
```

In the reputation term, P is the teacher's points total and n is the number of ratings. The damping means a new teacher starts at 3.5 out of 5 instead of 0, and a single 5-point rating does not outrank a long record.

**Explanation format**

The scoring function returns, per factor: `key`, `weight`, `value`, `contribution` (weight times value, rounded to an integer) and `reason`. Reason text is built from fixed templates filled with real values:

| Factor | Template when the value is high | Template when the value is low |
| --- | --- | --- |
| Availability | "3 of 4 sessions fit your availability" or "You are both free Tue 18:00–20:00" | "No overlap with your availability" |
| Level | "Taught at your level (beginner)" | "Aimed at advanced; you are a beginner" |
| Location | "In your area (Bratislava)" or "Online" | "In person in Trnava" |
| Reputation | "42 points from 9 learners" | "No ratings yet" |
| Mutual swap | "Wants to learn Guitar, which you teach" | Not shown |

Weights live in one exported constant so they can be tuned without touching the logic.

## 7. Pages and routes

Twelve routes; the last column maps each to the requirements it implements.

| Route | Page | Access | Requirements |
| --- | --- | --- | --- |
| `/` | Home | Public | HOME-1 to HOME-4 |
| `/register` | Registration | Logged out | AUTH-1 to AUTH-3 |
| `/login` | Login | Logged out | AUTH-4, AUTH-5 |
| `/skills` | Skill search, with `?q=` and `?category=` | Public | SKILL-1 to SKILL-4 |
| `/skills/:id` | Skill page: teachers and class agenda | Public | SKILL-5 to SKILL-7 |
| `/match/:skillId` | Ranked matches with explanations | Logged in | MATCH-1 to MATCH-6 |
| `/offers/new` | Create an offer | Logged in | OFFER-1 to OFFER-3 |
| `/offers/:id` | Offer page, with request and manage actions | Public; actions need login | OFFER-4, OFFER-5, BOOK-1 to BOOK-3 |
| `/users/:username` | Public profile, with invite action | Public; invite needs login | ACC-6, BOOK-4 |
| `/account` | Profile, skills, availability | Logged in | ACC-1 to ACC-3 |
| `/account/offers` | My offers | Logged in | ACC-4 |
| `/account/sessions` | Upcoming, Requests, History | Logged in | ACC-5, BOOK-5 to BOOK-8, RATE-1 |

**Global layout:** a header with the logo, the search box, a "Teach a skill" button, the requests badge (BOOK-7) and the account menu. Below 768 px the header collapses to the logo, the badge and a menu button.

## 8. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Responsive, mobile first. Every page is usable with no horizontal scrolling at 360 px, 768 px and 1280 px widths |
| NFR-2 | Touch targets are at least 44 by 44 px; tables become stacked cards below 768 px |
| NFR-3 | Row-level security is enabled on every table. Users can write only their own profile, skills, availability, offers and ratings; a booking can be changed only by its learner or the offer's teacher |
| NFR-4 | Booking status transitions, rating eligibility (RATE-3) and class capacity are enforced in the database with row-level security and constraints, never only in the client |
| NFR-5 | All form input is validated on the client before submission, and database constraints reject invalid rows; errors appear inline beside the field |
| NFR-6 | No service-role key or other secret is shipped to the browser; secrets come from environment variables listed in `.env.example` |
| NFR-7 | Accessibility: semantic headings and landmarks, a label on every input, full keyboard operation, visible focus, WCAG AA colour contrast |
| NFR-8 | Every list has a designed empty state with a next action, and every data fetch has a loading and an error state |
| NFR-9 | Times are stored in UTC and displayed in Europe/Bratislava in 24-hour format |
| NFR-10 | A README explains setup, environment variables, how to run migrations and the seed, and how to run the tests |

**Seed data**

The app must look populated on first load. One idempotent seed script creates:

- 3 localities, 8 categories, about 40 skills spread across the categories
- 20 users across the localities, each with teach and learn skills and weekly availability
- 30 offers mixing 1:1 and class, in person and online, across all levels, with future session dates relative to the day the seed runs
- Completed bookings with ratings, so that reputation varies between teachers
- Two demo accounts with known credentials documented in the README: one with rich history, one freshly registered

## 9. One-hour build

With one hour, the build is cut to a single path: register, find a skill, see explained matches, request a session, give points. This section overrides Sections 4 to 8 wherever they differ, and anything not listed here is deferred.

One hour is tight even for this cut. The largest risk is Supabase setup and authentication, so the plan has a fallback for it.

**Before the clock starts**

- Create the Supabase project, turn off email confirmation, and copy the project URL and anon key.
- Have Node installed, an empty repository, and this document saved in it as `SPEC.md`.

**Simplifications**

| Topic | Full spec | One-hour version |
| --- | --- | --- |
| Routes | Twelve routes | Five React Router routes: `/`, `/auth`, `/skills/:id`, `/match/:skillId`, `/me` |
| Search | Separate search page | On the home page: the search box and category chips filter the skill grid in place |
| Locality and category | Separate tables | Text columns with fixed lists defined in code |
| Availability | Weekly time slots | Four checkboxes stored as a text array on the profile: weekday daytime, weekday evening, weekend morning, weekend afternoon |
| Availability factor | Overlapping minutes | Number of blocks shared by learner and teacher, divided by 2, capped at 1 |
| Sessions | Dated rows per offer | No sessions table. A class offer has an optional `next_session_at`; a booking stores the chosen availability block |
| Booking flow | Request, accept, mark completed | Seeded offers have `auto_accept = true`, so a request is accepted at once. Offers created by real users are accepted by the teacher on `/me`. The learner can give points on any accepted booking |
| Seeded teachers | Auth accounts | Profile rows with no login (`auth_user_id` is null) |
| Rule enforcement | Row-level security plus constraints for status transitions and class capacity | Row-level security and database constraints only |
| Tests | Unit tests for matching | Matching stays one pure function in one file; tests are deferred |

**Tables**

| Table | Fields |
| --- | --- |
| `profiles` | `id`, `auth_user_id` (nullable, unique), `first_name`, `last_name`, `username`, `locality`, `availability` (text array), `bio` |
| `skills` | `id`, `name`, `category` |
| `user_skills` | `user_id`, `skill_id`, `role`, `level` |
| `offers` | `id`, `teacher_id`, `skill_id`, `title`, `description`, `format`, `level`, `mode`, `locality`, `session_count`, `max_participants`, `next_session_at`, `auto_accept` |
| `bookings` | `id`, `offer_id`, `learner_id`, `status`, `block`, `message` |
| `ratings` | `id`, `booking_id` (unique), `teacher_id`, `learner_id`, `points`, `comment` |

**Requirements in the cut**

- AUTH-1 (with the availability checkboxes added), AUTH-2, AUTH-4
- HOME-1 to HOME-4
- SKILL-1, SKILL-2, SKILL-5, SKILL-7
- OFFER-1 as a single form without session dates
- BOOK-2, BOOK-3, BOOK-7
- MATCH-1 to MATCH-6
- RATE-1, RATE-2
- ACC-5 as one list on `/me`
- NFR-1, NFR-7, NFR-8

**Time plan**

| Minutes | Prompt to the agent | Check before moving on |
| --- | --- | --- |
| 0 to 12 | P1: scaffold the app and Supabase client; write one SQL file with the six tables, row-level security policies and seed data (3 localities, about 24 skills, 12 teacher profiles, 18 offers, ratings) | The SQL runs in the Supabase SQL editor and the app lists skills from the database |
| 12 to 24 | P2: registration and login page, header, home page with hero, search, category chips, skill grid and nearby teachers | A new user registers and sees teachers from their locality |
| 24 to 40 | P3: skill page with teachers; the matching function; the match page with score, top three reasons and "Why this match?" | The five factor values on the top result are correct for the test user |
| 40 to 50 | P4: request from a match card; `/me` with my bookings, incoming requests and give points; the "Teach a skill" form | Points given appear on the teacher's card |
| 50 to 57 | P5: check every page at 360 px, keyboard and contrast check, empty states, community copy | No horizontal scrolling; every action reachable by keyboard |
| 57 to 60 | No prompt: rehearse the demo script once | Nothing new is started |

**Judging priorities**

- Working end-to-end demo: no step of the demo script needs a second account, and no feature is started after minute 50.
- Explainable matching: P3 gets the largest block, and the panel shows weight, value and reason for all five factors.
- UX and accessibility: every prompt ends with the same line, "semantic HTML, labelled inputs, keyboard operable, visible focus, works at 360 px", so it is not left to the final pass.
- Community impact: the hero states the purpose in one sentence (neighbours teaching neighbours, free of charge), three counters read from the database (skills offered, teachers, bookings), and the mutual-swap reason reads "You could swap: …".

**Fallbacks**

- Authentication not working by minute 20: replace login with a "Continue as" dropdown of seeded profiles; everything else is unchanged.
- Match page not working by minute 40: drop the "Teach a skill" form from P4 and keep request and points.
- Behind at minute 50: do only the 360 px check from P5.

**Prompting notes**

- Tell the agent to read `SPEC.md` first and that Section 9 overrides Sections 4 to 8.
- Give one prompt per time block, naming its requirement IDs.
- Tell the agent to implement nothing outside "Requirements in the cut", even if it seems helpful.

**Demo script**

1. Open the home page logged out: hero, counters, skills and teachers are populated.
2. Register with a locality, availability, one skill to teach and one to learn.
3. Search for the skill to learn, open it, and press "Find my best match".
4. Open "Why this match?" on the top result, read out the five factors, and point out the swap reason.
5. Request the session; it is accepted at once. Give points and show the teacher's total go up.

**After the hackathon**

The deferred requirements follow in this order: dated sessions and the class agenda (SKILL-6, OFFER-2), the full booking lifecycle and invitations (BOOK-1, BOOK-4, BOOK-5, BOOK-8), account management (ACC-1 to ACC-4, ACC-6), the calendar file (BOOK-6), unit tests (MATCH-7), and adding a skill (SKILL-4).
