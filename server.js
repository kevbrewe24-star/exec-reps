import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, getScenario } from './src/db.js';
import { makeGrader } from './src/grader.js';
import { hasKey } from './src/llm.js';
import { TRACKS } from './src/schema.js';
import {
  dailyScenarioId, bonusScenarioId, publicScenario, recordAnswer,
  stats, getProfile, saveProfile, localDay
} from './src/practice.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

export function createApp({ db = openDb(), grader = makeGrader() } = {}) {
  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const readBody = req => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 64_000) reject(Object.assign(new Error('Body too large'), { status: 413 })); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); } });
  });

  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/api/today' && req.method === 'GET') {
        const day = localDay();
        const s = getScenario(db, dailyScenarioId(db, day));
        const st = stats(db, day);
        return json(res, 200, { day, scenario: publicScenario(s), streak: st.streak, xp: st.xp, aiGrading: hasKey() });
      }
      if (url.pathname === '/api/bonus' && req.method === 'GET') {
        const id = bonusScenarioId(db);
        return json(res, 200, { scenario: id ? publicScenario(getScenario(db, id)) : null });
      }
      if (url.pathname === '/api/answer' && req.method === 'POST') {
        const body = await readBody(req);
        return json(res, 200, await recordAnswer(db, body, { grader }));
      }
      if (url.pathname === '/api/me' && req.method === 'GET') {
        return json(res, 200, { profile: getProfile(db), tracks: TRACKS, ...stats(db) });
      }
      if (url.pathname === '/api/profile' && req.method === 'POST') {
        return json(res, 200, { profile: saveProfile(db, await readBody(req)) });
      }
      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });

      // static files
      const rel = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
      const file = join(PUBLIC, rel);
      if (!file.startsWith(PUBLIC)) return json(res, 403, { error: 'Forbidden' });
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch (err) {
      if (err.code === 'ENOENT') return json(res, 404, { error: 'Not found' });
      json(res, err.status || 500, { error: err.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, () => {
    console.log(`Exec Reps running at http://localhost:${port}`);
    console.log(hasKey() ? 'AI grading: on' : 'AI grading: off (set ANTHROPIC_API_KEY to turn it on)');
  });
}
