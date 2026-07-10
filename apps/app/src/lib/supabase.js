/**
 * Frontend security model
 * -----------------------
 * - Only VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are used in the browser.
 * - NEVER put the service_role key in the frontend or .env used by Vite.
 * - All privileged writes go through SECURITY DEFINER RPCs (submit_game_result,
 *   create_room, update_room_payload) with auth.uid() checks + score clamps.
 * - Tables are RLS-locked: clients can SELECT public ranks/badges, but cannot
 *   INSERT/UPDATE leaderboard or history directly.
 */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (import.meta.env.DEV && anon && /service_role/i.test(anon)) {
  console.error('[cs4fun] Refusing service_role key in the browser. Use the anon key only.')
}

export const isSupabaseConfigured = Boolean(url && anon && !/service_role/i.test(anon))

export const supabase = isSupabaseConfigured
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 6 } },
    })
  : null
