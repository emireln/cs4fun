import { isSupabaseConfigured, supabase } from './supabase'

export async function fetchMyAccess() {
  if (!isSupabaseConfigured) {
    return { isAdmin: false, banned: false, banReason: null }
  }
  const { data, error } = await supabase.rpc('get_my_access')
  if (error) {
    console.warn('get_my_access', error.message)
    return { isAdmin: false, banned: false, banReason: null }
  }
  return {
    isAdmin: Boolean(data?.is_admin),
    banned: Boolean(data?.banned),
    banReason: data?.ban_reason || null,
  }
}

export async function adminDashboardStats() {
  const { data, error } = await supabase.rpc('admin_dashboard_stats')
  if (error) throw error
  return data
}

export async function adminListUsers({
  search = '',
  limit = 40,
  offset = 0,
  bannedOnly = false,
} = {}) {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: search || null,
    p_limit: limit,
    p_offset: offset,
    p_banned_only: bannedOnly,
  })
  if (error) throw error
  return data
}

export async function adminGetUser(id) {
  const { data, error } = await supabase.rpc('admin_get_user', { p_id: id })
  if (error) throw error
  return data
}

export async function adminBanUser(id, reason) {
  const { data, error } = await supabase.rpc('admin_ban_user', {
    p_id: id,
    p_reason: reason || null,
  })
  if (error) throw error
  return data
}

export async function adminUnbanUser(id) {
  const { data, error } = await supabase.rpc('admin_unban_user', { p_id: id })
  if (error) throw error
  return data
}

export async function adminListGames({ mode = null, limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc('admin_list_games', {
    p_mode: mode || null,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return data
}

export async function adminListRooms(limit = 40) {
  const { data, error } = await supabase.rpc('admin_list_rooms', { p_limit: limit })
  if (error) throw error
  return data
}

export async function adminCloseRoom(code) {
  const { data, error } = await supabase.rpc('admin_close_room', { p_code: code })
  if (error) throw error
  return data
}

export async function adminPurgeUserHistory(id) {
  const { data, error } = await supabase.rpc('admin_purge_user_history', { p_id: id })
  if (error) throw error
  return data
}

export async function adminResetProfile(id) {
  const { data, error } = await supabase.rpc('admin_reset_profile', { p_id: id })
  if (error) throw error
  return data
}
