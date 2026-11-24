# Exec Reps

A five-minute daily practice for directors and VPs: one realistic leadership scenario each
morning, you make the call, and you get feedback right away. Streaks and XP keep the habit going.

**Tracks in v0.1:** Revenue & forecasting · Operations & procurement · Incident leadership
(people-leadership judgment runs through all three).

## Run it

Requires **Node 22.9+**. There are no dependencies to install.

```bash
git clone https://github.com/<you>/exec-reps.git
cd exec-reps
npm start            # http://localhost:3000
npm test             # 9 tests
```

It works without any API key: 12 seed scenarios ship in `data/seed/scenarios.json`, and written
answers come back with a self-check rubric.

### Turn on AI feedback and fresh scenarios

```bash
cp .env.example .env     # then paste your Anthropic API key into .env
npm start                # written answers are now scored per rubric point, with a stronger rewrite
npm run generate -- --track ops --count 2   # new scenarios from current headlines
```

The generator reads **headline titles and links only** from the feeds in `config/feeds.json`,
asks Claude to write *original*, fictional scenarios inspired by those trends, validates each one,
and keeps only source links it actually fetched. It never copies article text. Swap the feeds for
ones you trust; the starter list wasn't checked from the build environment.

## How it works

| Piece | File |
|---|---|
| HTTP server + JSON API | `server.js` |
| Database (Node's built-in SQLite) | `src/db.js` → `data/exec-reps.db` |
| Daily pick, streaks, XP | `src/practice.js` |
| Rubric grading (AI or self-check) | `src/grader.js` |
| Headline → scenario generator | `src/generate.js` |
| Scenario shape + validation | `src/schema.js` |
| Front end (plain HTML/CSS/JS) | `public/` |

- **Daily rep:** fixed for the whole day, rotating through your chosen tracks. Never-seen scenarios
  come first, then the ones you saw longest ago.
- **Streak:** consecutive days with at least one rep. It stays alive until you miss a full day.
- **XP:** 10 + 10 × call quality (0–3), +10 for a written answer, + up to 20 for rubric points.

### API

`GET /api/today` · `GET /api/bonus` · `POST /api/answer {scenarioId, choice, written}` ·
`GET /api/me` · `POST /api/profile {name, tracks}`

Answers and explanations are never sent to the browser until you submit.

## Roadmap ideas

- Accounts and multi-user (it's single-user and local today)
- Spaced repetition: resurface scenarios you scored low on
- Team leaderboards and a weekly recap email
- More tracks: finance, people leadership, board communication
- Deploy (Fly.io / Render), or port the front end to Next.js
