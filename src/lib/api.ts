// Data access. Each function throws on error so react-query can show error states (NFR-8).
import { slotFromRow, type WeeklySlot } from './availability'
import type { BookingStatus, Format, Mode } from './domain'
import { likeEscape } from './domain'
import type { Level, MatchLearner, MatchOffer, OfferLevel } from './match'
import { supabase } from './supabase'

export interface Locality {
  id: string
  name: string
}
export interface Category {
  id: string
  name: string
}
export interface Profile {
  id: string
  first_name: string
  last_name: string
  username: string
  locality_id: string
  bio: string
  created_at: string
}
export interface SkillRow {
  id: string
  name: string
  category_id: string
  category_name: string
  active_offer_count: number
  teacher_count: number
}
export interface UserSkill {
  id: string
  user_id: string
  skill_id: string
  role: 'teach' | 'learn'
  level: Level | null
  skill: { id: string; name: string }
}
export interface AvailabilitySlot {
  id: string
  user_id: string
  weekday: number
  start_time: string
  end_time: string
}
export interface OfferCard {
  id: string
  teacher_id: string
  skill_id: string
  title: string
  description: string
  format: Format
  level: OfferLevel
  session_count: number
  session_duration_min: number
  mode: Mode
  locality_id: string | null
  max_participants: number
  status: 'active' | 'archived'
  created_at: string
  skill_name: string
  category_name: string
  locality_name: string | null
  teacher_username: string
  teacher_first_name: string
  teacher_last_name: string
  teacher_locality_id: string
  teacher_locality_name: string
  points_total: number
  rating_count: number
  accepted_count: number
  seats_left: number | null
  next_session_at: string | null
}
export interface Session {
  id: string
  offer_id: string
  booking_id: string | null
  sequence_no: number
  starts_at: string
  ends_at: string
  status: 'scheduled' | 'completed' | 'cancelled'
}
export interface BookingCard {
  id: string
  offer_id: string
  learner_id: string
  initiated_by: 'learner' | 'teacher'
  status: BookingStatus
  proposed_starts_at: string | null
  message: string
  created_at: string
  updated_at: string
  offer_title: string
  format: Format
  mode: Mode
  level: OfferLevel
  skill_id: string
  teacher_id: string
  session_count: number
  session_duration_min: number
  offer_status: 'active' | 'archived'
  skill_name: string
  teacher_username: string
  teacher_first_name: string
  teacher_last_name: string
  learner_username: string
  learner_first_name: string
  learner_last_name: string
  first_session_at: string | null
  last_session_end_at: string | null
  next_session_at: string | null
  session_rows: number
  rating_id: string | null
  rating_points: number | null
  rating_comment: string | null
}
export interface TeacherCard {
  id: string
  username: string
  first_name: string
  last_name: string
  locality_id: string
  locality_name: string
  points_total: number
  rating_count: number
  active_offer_count: number
}
export interface Rating {
  id: string
  points: number
  comment: string
  created_at: string
  learner: { username: string; first_name: string; last_name: string }
}

function unwrap<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) throw res.error
  return res.data as T
}

// Reference data ------------------------------------------------------------

export async function fetchLocalities(): Promise<Locality[]> {
  return unwrap(await supabase.from('localities').select('id, name').order('name'))
}

export async function fetchCategories(): Promise<Category[]> {
  const rows = unwrap<Category[]>(await supabase.from('categories').select('id, name'))
  // Keep the order from A7, with Other last.
  const order = ['Sports', 'Crafts', 'Creative', 'Languages', 'Music', 'Technology', 'Cooking', 'Other']
  const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : order.length)
  return rows.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
}

export async function fetchCommunityStats(): Promise<{ skills_offered: number; teachers: number; bookings: number }> {
  const rows = unwrap<{ skills_offered: number; teachers: number; bookings: number }[]>(
    await supabase.rpc('community_stats'),
  )
  return Array.isArray(rows) ? rows[0] : (rows as never)
}

// Skills ----------------------------------------------------------------------

export async function searchSkills(q: string, categoryId: string | null): Promise<SkillRow[]> {
  let query = supabase.from('skill_catalog').select('id, name, category_id, category_name, active_offer_count, teacher_count')
  if (q.trim()) query = query.ilike('name', `%${likeEscape(q.trim())}%`)
  if (categoryId) query = query.eq('category_id', categoryId)
  return unwrap(await query.order('active_offer_count', { ascending: false }).order('name').limit(200))
}

export async function fetchAllSkills(): Promise<SkillRow[]> {
  return unwrap(
    await supabase
      .from('skill_catalog')
      .select('id, name, category_id, category_name, active_offer_count, teacher_count')
      .order('name'),
  )
}

export async function fetchSkill(id: string): Promise<SkillRow | null> {
  return unwrap(
    await supabase
      .from('skill_catalog')
      .select('id, name, category_id, category_name, active_offer_count, teacher_count')
      .eq('id', id)
      .maybeSingle(),
  )
}

export async function findSkillByName(name: string): Promise<{ id: string; name: string } | null> {
  return unwrap(await supabase.from('skills').select('id, name').ilike('name', likeEscape(name.trim())).maybeSingle())
}

export async function addSkill(name: string, categoryId: string, userId: string): Promise<{ id: string }> {
  return unwrap(
    await supabase.from('skills').insert({ name: name.trim(), category_id: categoryId, created_by: userId }).select('id').single(),
  )
}

/** HOME-2/HOME-3: skills with active offers, optionally in one locality, most offered first. */
export async function fetchSkillsWithOffers(localityId: string | null, limit = 8) {
  let query = supabase.from('offer_cards').select('skill_id, skill_name, category_name, teacher_id').eq('status', 'active')
  if (localityId) query = query.or(`locality_id.eq.${localityId},teacher_locality_id.eq.${localityId}`)
  const rows = unwrap<{ skill_id: string; skill_name: string; category_name: string; teacher_id: string }[]>(await query)
  const bySkill = new Map<string, { id: string; name: string; category: string; offers: number; teachers: Set<string> }>()
  for (const r of rows) {
    const entry = bySkill.get(r.skill_id) ?? { id: r.skill_id, name: r.skill_name, category: r.category_name, offers: 0, teachers: new Set() }
    entry.offers++
    entry.teachers.add(r.teacher_id)
    bySkill.set(r.skill_id, entry)
  }
  return [...bySkill.values()]
    .sort((a, b) => b.offers - a.offers || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((s) => ({ id: s.id, name: s.name, category: s.category, offers: s.offers, teachers: s.teachers.size }))
}

export async function fetchTopTeachers(localityId: string | null, limit = 8): Promise<TeacherCard[]> {
  let query = supabase.from('teacher_directory').select('*').gt('active_offer_count', 0)
  if (localityId) query = query.eq('locality_id', localityId)
  return unwrap(
    await query.order('points_total', { ascending: false }).order('rating_count', { ascending: false }).limit(limit),
  )
}

// Offers ----------------------------------------------------------------------

export async function fetchOffersForSkill(skillId: string): Promise<OfferCard[]> {
  return unwrap(
    await supabase
      .from('offer_cards')
      .select('*')
      .eq('skill_id', skillId)
      .eq('status', 'active')
      .order('points_total', { ascending: false }),
  )
}

export async function fetchOffer(id: string): Promise<OfferCard | null> {
  return unwrap(await supabase.from('offer_cards').select('*').eq('id', id).maybeSingle())
}

export async function fetchOffersByTeacher(teacherId: string, activeOnly: boolean): Promise<OfferCard[]> {
  let query = supabase.from('offer_cards').select('*').eq('teacher_id', teacherId)
  if (activeOnly) query = query.eq('status', 'active')
  return unwrap(await query.order('status').order('created_at', { ascending: false }))
}

export interface AgendaEntry {
  id: string
  starts_at: string
  ends_at: string
  sequence_no: number
  offer: { id: string; title: string; session_count: number; teacher: { first_name: string; last_name: string } }
}

/** SKILL-6: upcoming class sessions for a skill. */
export async function fetchSkillAgenda(skillId: string): Promise<AgendaEntry[]> {
  return unwrap(
    await supabase
      .from('sessions')
      .select(
        'id, starts_at, ends_at, sequence_no, offer:offers!inner(id, title, session_count, skill_id, status, teacher:profiles!offers_teacher_id_fkey(first_name, last_name))',
      )
      .is('booking_id', null)
      .eq('status', 'scheduled')
      .eq('offer.skill_id', skillId)
      .eq('offer.status', 'active')
      .gt('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(50),
  )
}

/** Class sessions of an offer, plus 1:1 sessions the viewer is a party to. */
export async function fetchOfferSessions(offerId: string): Promise<Session[]> {
  return unwrap(await supabase.from('sessions').select('*').eq('offer_id', offerId).order('starts_at'))
}

export async function fetchBookingSessions(booking: Pick<BookingCard, 'id' | 'offer_id' | 'format'>): Promise<Session[]> {
  let query = supabase.from('sessions').select('*').neq('status', 'cancelled')
  query = booking.format === 'class' ? query.eq('offer_id', booking.offer_id).is('booking_id', null) : query.eq('booking_id', booking.id)
  return unwrap(await query.order('starts_at'))
}

export interface NewOffer {
  skill_id: string
  title: string
  description: string
  format: Format
  level: OfferLevel
  session_count: number
  session_duration_min: number
  mode: Mode
  locality_id: string | null
  max_participants: number | null
  session_starts: string[]
}

export async function createOffer(o: NewOffer): Promise<string> {
  return unwrap(
    await supabase.rpc('create_offer', {
      p_skill_id: o.skill_id,
      p_title: o.title,
      p_description: o.description,
      p_format: o.format,
      p_level: o.level,
      p_session_count: o.session_count,
      p_session_duration_min: o.session_duration_min,
      p_mode: o.mode,
      p_locality_id: o.locality_id as string,
      p_max_participants: o.max_participants as number,
      p_session_starts: o.session_starts,
    }),
  )
}

export async function updateOffer(id: string, patch: { description?: string; status?: 'archived' }) {
  unwrap(await supabase.from('offers').update(patch).eq('id', id).select('id').single())
}

export async function addSession(booking: BookingCard, sequenceNo: number, startsAt: Date) {
  const endsAt = new Date(startsAt.getTime() + booking.session_duration_min * 60000)
  unwrap(
    await supabase.from('sessions').insert({
      offer_id: booking.offer_id,
      booking_id: booking.id,
      sequence_no: sequenceNo,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    }),
  )
}

// Bookings --------------------------------------------------------------------

export async function fetchMyBookings(userId: string): Promise<BookingCard[]> {
  return unwrap(
    await supabase
      .from('booking_cards')
      .select('*')
      .or(`learner_id.eq.${userId},teacher_id.eq.${userId}`)
      .order('created_at', { ascending: false }),
  )
}

export async function fetchBookingsForOffer(offerId: string): Promise<BookingCard[]> {
  return unwrap(await supabase.from('booking_cards').select('*').eq('offer_id', offerId).order('created_at', { ascending: false }))
}

export async function fetchOpenBookingsBetween(teacherId: string, learnerId: string): Promise<BookingCard[]> {
  return unwrap(
    await supabase
      .from('booking_cards')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('learner_id', learnerId)
      .in('status', ['pending', 'accepted']),
  )
}

export async function createBooking(b: {
  offer_id: string
  learner_id: string
  initiated_by: 'learner' | 'teacher'
  proposed_starts_at: string | null
  message: string
}) {
  unwrap(await supabase.from('bookings').insert(b))
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  unwrap(await supabase.from('bookings').update({ status }).eq('id', id).select('id').single())
}

export async function fetchPendingCount(): Promise<number> {
  return unwrap(await supabase.rpc('pending_response_count'))
}

// Ratings ---------------------------------------------------------------------

export async function createRating(bookingId: string, learnerId: string, points: number, comment: string) {
  // teacher_id is overwritten from the booking by a database trigger (RATE-3).
  unwrap(
    await supabase.from('ratings').insert({ booking_id: bookingId, learner_id: learnerId, teacher_id: learnerId, points, comment }),
  )
}

export async function fetchTeacherStats(userId: string): Promise<{ points_total: number; rating_count: number }> {
  const row = unwrap<{ points_total: number; rating_count: number } | null>(
    await supabase.from('teacher_stats').select('points_total, rating_count').eq('teacher_id', userId).maybeSingle(),
  )
  return row ?? { points_total: 0, rating_count: 0 }
}

export async function fetchRatingsForTeacher(userId: string): Promise<Rating[]> {
  return unwrap(
    await supabase
      .from('ratings')
      .select('id, points, comment, created_at, learner:profiles!ratings_learner_id_fkey(username, first_name, last_name)')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  )
}

// Profiles, skills, availability ---------------------------------------------

export async function fetchProfile(id: string): Promise<Profile | null> {
  return unwrap(await supabase.from('profiles').select('*').eq('id', id).maybeSingle())
}

export async function fetchProfileByUsername(username: string): Promise<(Profile & { locality: Locality }) | null> {
  return unwrap(
    await supabase.from('profiles').select('*, locality:localities(id, name)').eq('username', username.toLowerCase()).maybeSingle(),
  )
}

export async function usernameAvailable(username: string): Promise<boolean> {
  return unwrap(await supabase.rpc('username_available', { p_username: username }))
}

export async function updateProfile(id: string, patch: Pick<Profile, 'first_name' | 'last_name' | 'locality_id' | 'bio'>) {
  unwrap(await supabase.from('profiles').update(patch).eq('id', id).select('id').single())
}

export async function fetchUserSkills(userId: string): Promise<UserSkill[]> {
  return unwrap(
    await supabase
      .from('user_skills')
      .select('id, user_id, skill_id, role, level, skill:skills(id, name)')
      .eq('user_id', userId)
      .order('created_at'),
  )
}

export async function addUserSkills(rows: { user_id: string; skill_id: string; role: 'teach' | 'learn'; level: Level | null }[]) {
  if (rows.length === 0) return
  unwrap(await supabase.from('user_skills').upsert(rows, { onConflict: 'user_id,skill_id,role', ignoreDuplicates: true }))
}

export async function updateUserSkillLevel(id: string, level: Level | null) {
  unwrap(await supabase.from('user_skills').update({ level }).eq('id', id))
}

export async function removeUserSkill(id: string) {
  unwrap(await supabase.from('user_skills').delete().eq('id', id))
}

export async function fetchAvailability(userId: string): Promise<AvailabilitySlot[]> {
  return unwrap(
    await supabase.from('availability_slots').select('*').eq('user_id', userId).order('weekday').order('start_time'),
  )
}

export async function addAvailability(userId: string, weekday: number, start: string, end: string) {
  unwrap(await supabase.from('availability_slots').insert({ user_id: userId, weekday, start_time: start, end_time: end }))
}

export async function removeAvailability(id: string) {
  unwrap(await supabase.from('availability_slots').delete().eq('id', id))
}

// Matching --------------------------------------------------------------------

export type MatchCandidate = MatchOffer & { card: OfferCard }

export interface MatchData {
  learner: MatchLearner
  candidates: MatchCandidate[]
  openBookingOfferIds: Set<string>
}

/** Loads everything the pure matching function needs for one skill (MATCH-1). */
export async function fetchMatchData(skillId: string, profile: Profile, localityName: string): Promise<MatchData> {
  const [offers, mySkills, mySlots, myBookings] = await Promise.all([
    fetchOffersForSkill(skillId),
    fetchUserSkills(profile.id),
    fetchAvailability(profile.id),
    supabase.from('bookings').select('offer_id').eq('learner_id', profile.id).in('status', ['pending', 'accepted']),
  ])
  const openBookingOfferIds = new Set(unwrap<{ offer_id: string }[]>(myBookings).map((b) => b.offer_id))

  const teacherIds = [...new Set(offers.map((o) => o.teacher_id))]
  const classIds = offers.filter((o) => o.format === 'class').map((o) => o.id)
  const [teacherSlots, teacherLearn, sessions] = await Promise.all([
    teacherIds.length
      ? supabase.from('availability_slots').select('user_id, weekday, start_time, end_time').in('user_id', teacherIds)
      : { data: [], error: null },
    teacherIds.length
      ? supabase.from('user_skills').select('user_id, skill:skills(id, name)').eq('role', 'learn').in('user_id', teacherIds)
      : { data: [], error: null },
    classIds.length
      ? supabase
          .from('sessions')
          .select('offer_id, starts_at, ends_at')
          .in('offer_id', classIds)
          .is('booking_id', null)
          .eq('status', 'scheduled')
          .gt('starts_at', new Date().toISOString())
      : { data: [], error: null },
  ])

  const slotsByUser = new Map<string, WeeklySlot[]>()
  for (const s of unwrap<{ user_id: string; weekday: number; start_time: string; end_time: string }[]>(teacherSlots)) {
    slotsByUser.set(s.user_id, [...(slotsByUser.get(s.user_id) ?? []), slotFromRow(s)])
  }
  const learnByUser = new Map<string, { id: string; name: string }[]>()
  for (const s of unwrap<{ user_id: string; skill: { id: string; name: string } }[]>(teacherLearn)) {
    learnByUser.set(s.user_id, [...(learnByUser.get(s.user_id) ?? []), s.skill])
  }
  const sessionsByOffer = new Map<string, { startsAt: string; endsAt: string }[]>()
  for (const s of unwrap<{ offer_id: string; starts_at: string; ends_at: string }[]>(sessions)) {
    sessionsByOffer.set(s.offer_id, [...(sessionsByOffer.get(s.offer_id) ?? []), { startsAt: s.starts_at, endsAt: s.ends_at }])
  }

  const learnEntry = mySkills.find((s) => s.skill_id === skillId && s.role === 'learn')
  const learner: MatchLearner = {
    id: profile.id,
    localityId: profile.locality_id,
    localityName,
    level: learnEntry?.level ?? null,
    availability: mySlots.map(slotFromRow),
    teachSkills: mySkills.filter((s) => s.role === 'teach').map((s) => s.skill),
  }

  const candidates: MatchCandidate[] = offers.map((o) => ({
    card: o,
    id: o.id,
    teacherId: o.teacher_id,
    format: o.format,
    level: o.level,
    mode: o.mode,
    localityId: o.locality_id,
    localityName: o.locality_name,
    sessionDurationMin: o.session_duration_min,
    createdAt: o.created_at,
    status: o.status,
    seatsLeft: o.seats_left,
    sessions: sessionsByOffer.get(o.id) ?? [],
    teacher: {
      pointsTotal: o.points_total,
      ratingCount: o.rating_count,
      availability: slotsByUser.get(o.teacher_id) ?? [],
      learnSkills: learnByUser.get(o.teacher_id) ?? [],
    },
  }))

  return { learner, candidates, openBookingOfferIds }
}
