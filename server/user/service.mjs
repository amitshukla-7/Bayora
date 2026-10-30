import crypto from 'node:crypto';
import { getDb } from '../db.mjs';

/**
 * User Profile & Notification Management Service
 * Source of truth: SQLite tables user_profile, users, and notifications.
 */

export function getUserProfile(userId = 'user_amit_shukla') {
  const db = getDb();
  let row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get(userId);

  if (!row) {
    // Check if user exists in users table
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (u) {
      db.prepare(`
        INSERT INTO user_profile (id, name, role, email, avatar_initials, organization, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(u.id, u.name, u.role, u.email, u.avatar_initials, u.organization);
      row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get(userId);
    } else {
      // Default to primary profile
      row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('user_amit_shukla');
      if (!row) {
        db.prepare(`
          INSERT INTO user_profile (id, name, role, email, avatar_initials, organization)
          VALUES ('user_amit_shukla', 'Amit Shukla', 'Principal Architect', 'amitshukla@1234', 'AS', 'Bayora Technologies')
        `).run();
        row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('user_amit_shukla');
      }
    }
  }
  return row;
}

export function updateUserProfile(data, userId = 'user_amit_shukla') {
  const db = getDb();
  const current = getUserProfile(userId);

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
    WHERE id = ?
  `).run(name, role, email, initials, organization, now, userId);

  // Sync to users table if present
  try {
    db.prepare(`
      UPDATE users
      SET name = ?, role = ?, organization = ?, avatar_initials = ?, updated_at = ?
      WHERE id = ?
    `).run(name, role, organization, initials, now, userId);
  } catch {}

  return getUserProfile(userId);
}

export function getNotifications(limit = 20, userId = 'user_amit_shukla') {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM notifications
    WHERE (user_id = ? OR (? = 'user_amit_shukla' AND user_id IS NULL))
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, userId, limit);

  const unreadCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM notifications 
    WHERE (user_id = ? OR (? = 'user_amit_shukla' AND user_id IS NULL)) AND is_read = 0
  `).get(userId, userId);

  return {
    notifications: rows.map(r => ({
      ...r,
      read: Boolean(r.is_read)
    })),
    unreadCount: unreadCountRow ? Number(unreadCountRow.count) : 0,
    total: rows.length
  };
}

export function addNotification({ title, message, type = 'info', link = null, userId = 'user_amit_shukla' }) {
  const db = getDb();
  const id = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO notifications (id, title, message, type, is_read, link, created_at, user_id)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)
  `).run(id, title, message, type, link, now, userId);

  return { id, title, message, type, is_read: 0, link, created_at: now, user_id: userId };
}

export function markNotificationsRead(ids = null, userId = 'user_amit_shukla') {
  const db = getDb();
  if (Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE (user_id = ? OR (? = 'user_amit_shukla' AND user_id IS NULL)) AND id IN (${placeholders})
    `).run(userId, userId, ...ids);
  } else {
    db.prepare(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE (user_id = ? OR (? = 'user_amit_shukla' AND user_id IS NULL))
    `).run(userId, userId);
  }
  return getNotifications(20, userId);
}
