import crypto from 'node:crypto';
import { getDb } from '../db.mjs';

/**
 * Enterprise Password & Session Authentication Service
 * Uses Node.js native crypto.scrypt for memory-hard key derivation
 * and crypto.timingSafeEqual for constant-time hash comparisons (CWE-208).
 */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    salt,
    hash: derivedKey.toString('hex')
  };
}

export function verifyPassword(password, salt, storedHash) {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(derivedKey.toString('hex'), 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (keyBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, storedBuf);
  } catch {
    return false;
  }
}

export function generateSessionToken() {
  return `byra_sess_${crypto.randomBytes(32).toString('hex')}`;
}

export function createSession(userId, ip = null, userAgent = null) {
  const db = getDb();
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7-day validity

  db.prepare(`
    INSERT INTO sessions (id, user_id, created_at, expires_at, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, userId, now.toISOString(), expiresAt, ip, userAgent);

  return { token, expiresAt };
}

export function getUserFromSession(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('byra_sess_')) {
    return null;
  }
  const db = getDb();
  const row = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.organization, u.avatar_initials, u.created_at, u.updated_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(token);

  return row || null;
}

export function getUserById(userId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, email, name, role, organization, avatar_initials, created_at, updated_at
    FROM users
    WHERE id = ?
  `).get(userId);

  return row || null;
}

export function getUserByEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const db = getDb();
  const row = db.prepare(`
    SELECT id, email, password_hash, salt, name, role, organization, avatar_initials, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER(?)
  `).get(email.trim());

  return row || null;
}

export function registerUser({ email, password, name, organization, role }) {
  if (!email || typeof email !== 'string' || email.trim().length < 3) {
    throw new Error('Valid email or username is required (min 3 characters)');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const cleanEmail = email.trim();
  const db = getDb();

  const existing = getUserByEmail(cleanEmail);
  if (existing) {
    throw new Error('An account with this email or username already exists');
  }

  const userId = `user_${crypto.randomBytes(8).toString('hex')}`;
  const { salt, hash } = hashPassword(password);
  const displayName = (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanEmail.split('@')[0];
  const org = (organization && typeof organization === 'string' && organization.trim()) ? organization.trim() : 'Independent Workspace';
  const userRole = (role && typeof role === 'string' && role.trim()) ? role.trim() : 'Security Engineer';

  // Compute initials
  const parts = displayName.split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase();

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, role, organization, avatar_initials, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, cleanEmail, hash, salt, displayName, userRole, org, initials, now, now);

  // Sync to user_profile table for UI compatibility
  db.prepare(`
    INSERT OR REPLACE INTO user_profile (id, name, role, email, avatar_initials, organization, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, displayName, userRole, cleanEmail, initials, org, now);

  // Seed isolated starter model templates for this new user
  seedStarterModelsForUser(db, userId);

  const { token, expiresAt } = createSession(userId);
  const safeUser = {
    id: userId,
    email: cleanEmail,
    name: displayName,
    role: userRole,
    organization: org,
    avatar_initials: initials,
    created_at: now,
    updated_at: now
  };

  return { user: safeUser, token, expiresAt };
}

export function loginUser({ email, password, ip = null, userAgent = null }) {
  if (!email || !password) {
    throw new Error('Email/username and password are required');
  }

  const user = getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const valid = verifyPassword(password, user.salt, user.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const { token, expiresAt } = createSession(user.id, ip, userAgent);
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organization: user.organization,
    avatar_initials: user.avatar_initials,
    created_at: user.created_at,
    updated_at: user.updated_at
  };

  return { user: safeUser, token, expiresAt };
}

export function logoutSession(token) {
  if (!token) return true;
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
  return true;
}

export function seedStarterModelsForUser(db, userId) {
  const now = new Date().toISOString();
  const starterModels = [
    {
      id: `mod_${crypto.randomBytes(4).toString('hex')}`,
      name: 'SmolLM 135M (Local Ollama)',
      provider: 'ollama',
      identifier: 'smollm:135m',
      model_identifier: 'smollm:135m',
      version: '1.0.0',
      description: 'Local verified evaluation model ready for red-teaming.',
      model_type: 'Instruct LLM',
      execution_mode: 'Live',
      endpoint: 'http://localhost:11434',
      base_url: 'http://localhost:11434',
      api_key_env: null,
      parameters: JSON.stringify({ temperature: 0.0, seed: 42, max_tokens: 128 }),
      status: 'Active',
      registered_at: now,
      is_synthetic: 0,
      user_id: userId
    },
    {
      id: `mod_${crypto.randomBytes(4).toString('hex')}`,
      name: 'Adaptation Defense Model',
      provider: 'ollama',
      identifier: 'smollm:135m',
      model_identifier: 'smollm:135m',
      version: '2.4.0',
      description: 'Adaptive perimeter defense model with automated prompt isolation.',
      model_type: 'Instruct LLM',
      execution_mode: 'Live',
      endpoint: 'http://localhost:11434',
      base_url: 'http://localhost:11434',
      api_key_env: null,
      parameters: JSON.stringify({ temperature: 0.0, seed: 42, max_tokens: 128 }),
      status: 'Active',
      registered_at: now,
      is_synthetic: 0,
      user_id: userId
    }
  ];

  const insert = db.prepare(`
    INSERT INTO models (
      id, name, provider, identifier, model_identifier, version, description,
      model_type, execution_mode, endpoint, base_url, api_key_env, parameters,
      status, registered_at, is_synthetic, user_id
    ) VALUES (
      @id, @name, @provider, @identifier, @model_identifier, @version, @description,
      @model_type, @execution_mode, @endpoint, @base_url, @api_key_env, @parameters,
      @status, @registered_at, @is_synthetic, @user_id
    )
  `);

  for (const m of starterModels) {
    insert.run(m);
  }
}
