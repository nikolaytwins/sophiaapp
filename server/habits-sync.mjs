#!/usr/bin/env node
/**
 * Минимальный сервер синхронизации привычек (JSON на диске).
 *
 * Запуск: SOPHIA_HABITS_SYNC_KEY=secret npm run habits-server
 * Опционально: SOPHIA_HABITS_PORT=8790 SOPHIA_HABITS_DATA_DIR=./data/habits-sync
 *
 * Если задан SOPHIA_HABITS_SYNC_KEY на сервере — принимается только этот Bearer.
 * Иначе любой непустой Bearer (файл состояния = hash от токена).
 */
import { createHash } from 'crypto';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SOPHIA_HABITS_PORT || 8790);
const DATA_DIR = process.env.SOPHIA_HABITS_DATA_DIR || path.join(__dirname, '..', 'data', 'habits-sync');
const FIXED_SYNC_KEY = (process.env.SOPHIA_HABITS_SYNC_KEY || '').trim();

function statePathForToken(token) {
  const h = createHash('sha256').update(token, 'utf8').digest('hex').slice(0, 48);
  return path.join(DATA_DIR, `${h}.json`);
}

function parseBearer(req) {
  const a = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(a);
  return m ? m[1].trim() : '';
}

function authorize(token) {
  if (!token) return null;
  if (FIXED_SYNC_KEY) return token === FIXED_SYNC_KEY ? token : null;
  return token;
}

function defaultState() {
  return { habits: [], defaultsSeeded: false, heroHistory: {} };
}

function normalizeBody(j) {
  if (!j || typeof j !== 'object') return defaultState();
  return {
    habits: Array.isArray(j.habits) ? j.habits : [],
    defaultsSeeded: Boolean(j.defaultsSeeded),
    heroHistory:
      j.heroHistory && typeof j.heroHistory === 'object' && !Array.isArray(j.heroHistory)
        ? j.heroHistory
        : {},
  };
}

function readState(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return normalizeBody(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1`);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'sophia-habits-sync' });
    return;
  }

  const token = authorize(parseBearer(req));
  if (!token) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  const file = statePathForToken(token);

  if (req.method === 'GET' && url.pathname === '/v1/state') {
    const state = readState(file);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === 'PUT' && url.pathname === '/v1/state') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 2_000_000) req.destroy();
    });
    req.on('end', () => {
      try {
        const j = body ? JSON.parse(body) : {};
        const state = normalizeBody(j);
        writeState(file, state);
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 400, { error: e instanceof Error ? e.message : String(e) });
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/v1/export.json') {
    const state = readState(file);
    sendJson(res, 200, { exportedAt: new Date().toISOString(), ...state });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Sophia habits sync listening on http://127.0.0.1:${PORT}`);
  console.log(`Data dir: ${DATA_DIR}`);
});
