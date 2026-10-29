import crypto from 'node:crypto';
import { getDb } from '../db.mjs';

/**
 * User Profile & Notification Management Service
 * Source of truth: SQLite tables user_profile and notifications.
 */

export function getUserProfile() {
  const db = getDb();
  let row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('current_user');
  if (!row) {
    db.prepare(`
      INSERT INTO user_profile (id, name, role, email, avatar_initials, organization)
      VALUES ('current_user', 'Amit Shukla', 'Principal Architect', 'amit.shukla@bayora.enterprise', 'AS', 'Bayora Technologies')
    `).run();
    row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('current_user');
  }
  return row;
}

export function updateUserProfile(data) {
  const db = getDb();
  const current = getUserProfile();

  const name = data.name !== undefined ? String(data.name).trim() : current.name;
  const role = data.role !== undefined ? String(data.role).trim() : current.role;
  const email = data.email !== undefined ? String(data.email).trim() : current.email;
  const organization = data.organization !== undefined ? String(data.organization).trim() : current.organization;

  // Compute initials
  let initials = current.avatar_initials;
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE user_profile
    SET name = ?, role = ?, email = ?, avatar_initials = ?, organization = ?, updated_at = ?
    WHERE id = 'current_user'
  `).run(name, role, email, initials, organization, now);

  return getUserProfile();
}

export function getNotifications(limit = 20) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM notifications
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  const unreadCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE is_read = 0
  `).get();

  return {
    notifications: rows.map(r => ({
      ...r,
      read: Boolean(r.is_read)
    })),
    unreadCount: unreadCountRow ? Number(unreadCountRow.count) : 0,
    total: rows.length
  };
}

export function addNotification({ title, message, type = 'info', link = null }) {
  const db = getDb();
  const id = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO notifications (id, title, message, type, is_read, link, created_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(id, title, message, type, link, now);

  return { id, title, message, type, is_read: 0, link, created_at: now };
}

export function markNotificationsRead(ids = null) {
  const db = getDb();
  if (Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders})`).run(...ids);
  } else {
    db.prepare('UPDATE notifications SET is_read = 1').run();
  }
  return getNotifications();
}

