/**
 * Lightweight clan tags stored locally (cloud sync can follow later).
 * Max 5 members; points sum weekly engagement.
 */

import { utcWeekKey } from './challenges'

const KEY = 'cs4fun_clans_v1'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function getMyClan(userId) {
  const all = read()
  const tag = all.membership?.[userId]
  if (!tag) return null
  return all.clans?.[tag] || null
}

export function createClan(userId, nickname, tagRaw) {
  const tag = String(tagRaw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5)
  if (tag.length < 2) return { error: 'tag_short' }
  const all = read()
  if (all.clans?.[tag]) return { error: 'taken' }
  if (all.membership?.[userId]) return { error: 'already' }
  all.clans = all.clans || {}
  all.membership = all.membership || {}
  all.clans[tag] = {
    tag,
    leaderId: userId,
    members: [{ id: userId, nickname: nickname || 'Player' }],
    createdAt: Date.now(),
    weekPoints: {},
  }
  all.membership[userId] = tag
  write(all)
  return { clan: all.clans[tag] }
}

export function joinClan(userId, nickname, tagRaw) {
  const tag = String(tagRaw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5)
  const all = read()
  const clan = all.clans?.[tag]
  if (!clan) return { error: 'missing' }
  if (all.membership?.[userId]) return { error: 'already' }
  if (clan.members.length >= 5) return { error: 'full' }
  clan.members.push({ id: userId, nickname: nickname || 'Player' })
  all.membership[userId] = tag
  write(all)
  return { clan }
}

export function leaveClan(userId) {
  const all = read()
  const tag = all.membership?.[userId]
  if (!tag) return { ok: true }
  const clan = all.clans?.[tag]
  if (clan) {
    clan.members = clan.members.filter((m) => m.id !== userId)
    if (!clan.members.length) delete all.clans[tag]
    else if (clan.leaderId === userId) clan.leaderId = clan.members[0].id
  }
  delete all.membership[userId]
  write(all)
  return { ok: true }
}

export function addClanWeekPoints(userId, points = 1) {
  const all = read()
  const tag = all.membership?.[userId]
  if (!tag || !all.clans?.[tag]) return
  const week = utcWeekKey()
  const clan = all.clans[tag]
  clan.weekPoints = clan.weekPoints || {}
  clan.weekPoints[week] = (clan.weekPoints[week] || 0) + points
  write(all)
}

export function clanWeekScore(clan) {
  if (!clan) return 0
  return clan.weekPoints?.[utcWeekKey()] || 0
}
