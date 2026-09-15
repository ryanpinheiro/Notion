import fs from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.notion.com/v1';
const token = process.env.NOTION_TOKEN;
const sources = {
  habits: process.env.NOTION_HABITS_DATABASE_ID,
  habitLog: process.env.NOTION_HABIT_LOG_DATABASE_ID,
  finance: process.env.NOTION_FINANCE_DATABASE_ID,
  work: process.env.NOTION_WORK_DATABASE_ID,
  contests: process.env.NOTION_CONTEST_DATABASE_ID,
  projects: process.env.NOTION_PROJECTS_DATABASE_ID,
  roadmap: process.env.NOTION_ROADMAP_DATABASE_ID
};

function sanitizeDashboard(payload) {
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  return {
    generatedAt: new Date().toISOString(),
    mock: false,
    habits: {
      active: number(payload.active),
      completionRate: Math.min(100, Math.max(0, number(payload.completionRate))),
      currentStreak: number(payload.currentStreak),
      longestStreak: number(payload.longestStreak)
    }
  };
}

async function queryDatabase(id) {
  if (!id) return [];
  const response = await fetch(`${API}/databases/${id}/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }, body: '{}' });
  if (!response.ok) throw new Error(`Notion respondeu ${response.status}`);
  return (await response.json()).results;
}

async function main() {
  if (!token) { console.log('NOTION_TOKEN ausente; dados mock preservados.'); return; }
  const habitRows = await queryDatabase(sources.habits);
  const safe = sanitizeDashboard({ active: habitRows.length, completionRate: 0, currentStreak: 0, longestStreak: 0 });
  await fs.writeFile(path.join(process.cwd(), 'assets/data/notion-summary.json'), JSON.stringify(safe, null, 2) + '\n');
  console.log('Sincronização concluída: somente dados agregados foram exportados.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
