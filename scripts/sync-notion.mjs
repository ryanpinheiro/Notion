import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2025-09-03';
const ENV = typeof process === 'undefined' ? {} : process.env;
const OUTPUT_PATH = path.resolve('assets/data/habits.json');
const DAY_MS = 86_400_000;
const AREA_COLORS = { Trabalho: '#4f8cff', Concursos: '#a879ff', CNH: '#f59e42', Faculdade: '#42c983', Projetos: '#6f78ff', Saúde: '#f45b69', Pessoal: '#f6c85f' };
const AREA_ICONS = { Trabalho: '▣', Concursos: '▤', CNH: '◎', Faculdade: '⌁', Projetos: '⌘', Saúde: '♡', Pessoal: '◇' };
const text = p => (p?.title || p?.rich_text || []).map(item => item.plain_text || '').join('').trim();
const select = p => p?.select?.name ?? null;
const number = p => Number.isFinite(p?.number) ? p.number : null;
const multiSelect = p => (p?.multi_select || []).map(item => item.name);
const date = p => p?.date?.start?.slice(0, 10) ?? null;

export async function queryDataSource(dataSourceId, { token, fetchImpl = fetch } = {}) {
  if (!dataSourceId) throw new Error('Data Source ID não configurado.');
  if (!token) throw new Error('NOTION_TOKEN não configurado.');
  const results = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const response = await fetchImpl(`${API}/data_sources/${dataSourceId}/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Notion respondeu ${response.status} ao consultar um Data Source.`);
    const payload = await response.json();
    if (!Array.isArray(payload.results)) throw new Error('Resposta inválida da API do Notion.');
    results.push(...payload.results);
    cursor = payload.has_more ? payload.next_cursor : null;
    if (payload.has_more && !cursor) throw new Error('Paginação inválida: next_cursor ausente.');
  } while (cursor);
  return results;
}

export const fetchHabits = config => queryDataSource(config.habitsDataSourceId, config);
export const fetchHabitLogs = config => queryDataSource(config.logsDataSourceId, config);

export function parseHabit(page) {
  const p = page?.properties || {};
  return { name: text(p['Hábito']), area: select(p['Área']) || 'Pessoal', status: select(p.Status), weeklyGoal: number(p['Meta semanal']), targetMinutes: number(p['Duração alvo (min)']), plannedDays: multiSelect(p['Dias planejados']) };
}

export function parseHabitLog(page) {
  const p = page?.properties || {};
  return { date: date(p.Data), result: select(p.Resultado), duration: number(p['Duração (min)']), habitRef: p['Hábito']?.relation?.[0]?.id ?? null };
}

const dateRange = (start, end) => { const values = []; for (let time = Date.parse(`${start}T12:00:00Z`); time <= Date.parse(`${end}T12:00:00Z`); time += DAY_MS) values.push(new Date(time).toISOString().slice(0, 10)); return values; };
const weekKey = value => { const d = new Date(`${value}T12:00:00Z`); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return `${d.getUTCFullYear()}-W${String(Math.ceil((((d - yearStart) / DAY_MS) + 1) / 7)).padStart(2, '0')}`; };

export function aggregateHabits(habits, logs, generatedAt = new Date().toISOString()) {
  const active = habits.filter(h => h.status === 'Ativo' && h.name);
  const evaluable = logs.filter(l => l.date && ['Feito', 'Não feito'].includes(l.result));
  const done = evaluable.filter(l => l.result === 'Feito').length;
  const missed = evaluable.filter(l => l.result === 'Não feito').length;
  const completionRate = done + missed ? Math.round(done / (done + missed) * 100) : null;
  const grouped = new Map();
  for (const log of logs.filter(l => l.date)) { if (!grouped.has(log.date)) grouped.set(log.date, []); grouped.get(log.date).push(log); }
  const daily = [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([day, entries]) => {
    const assessed = entries.filter(e => ['Feito', 'Não feito'].includes(e.result));
    const dayDone = assessed.filter(e => e.result === 'Feito').length;
    const dayMissed = assessed.filter(e => e.result === 'Não feito').length;
    const state = !assessed.length ? 'skipped' : dayDone && dayMissed ? 'partial' : dayDone ? 'done' : 'missed';
    return { date: day, state, done: dayDone, missed: dayMissed, skipped: entries.filter(e => e.result === 'Pulado / não aplicável').length, minutes: entries.reduce((sum, e) => sum + (e.duration ?? 0), 0) };
  });
  let currentStreak = 0, bestStreak = 0, running = 0;
  if (daily.length) { const completed = new Map(daily.map(d => [d.date, d.done > 0])); for (const day of dateRange(daily[0].date, daily.at(-1).date)) { running = completed.get(day) ? running + 1 : 0; bestStreak = Math.max(bestStreak, running); } currentStreak = running; }
  const habitStats = new Map(active.map(h => [h.name, { done: 0, missed: 0, minutes: 0 }]));
  for (const log of logs) { if (!log.habitName || !habitStats.has(log.habitName)) continue; const stats = habitStats.get(log.habitName); if (log.result === 'Feito') stats.done++; if (log.result === 'Não feito') stats.missed++; stats.minutes += log.duration ?? 0; }
  const byWeek = new Map();
  for (const log of logs.filter(l => l.date)) { const key = weekKey(log.date); if (!byWeek.has(key)) byWeek.set(key, { week: key, done: 0, missed: 0, minutes: 0 }); const week = byWeek.get(key); if (log.result === 'Feito') week.done++; if (log.result === 'Não feito') week.missed++; week.minutes += log.duration ?? 0; }
  const weekly = [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week)).map(w => ({ ...w, completionRate: w.done + w.missed ? Math.round(w.done / (w.done + w.missed) * 100) : null }));
  return { generatedAt, source: 'notion', summary: { activeHabits: active.length, completionRate, currentStreak, bestStreak, done, missed }, habits: active.map(h => { const s = habitStats.get(h.name); const total = s.done + s.missed; return { name: h.name, area: h.area, weeklyGoal: h.weeklyGoal, targetMinutes: h.targetMinutes, plannedDays: h.plannedDays, done: s.done, missed: s.missed, completionRate: total ? Math.round(s.done / total * 100) : null, minutes: s.minutes, icon: AREA_ICONS[h.area] || '◇', color: AREA_COLORS[h.area] || '#4f8cff' }; }), daily, weekly, byHabit: [...habitStats].map(([name, stats]) => ({ name, ...stats })), studyMinutes: weekly.map(w => ({ week: w.week, minutes: w.minutes })) };
}

export const sanitizeHabits = payload => JSON.parse(JSON.stringify(payload));
export function validatePublicData(data) { if (data?.source !== 'notion' || !data.summary || !Array.isArray(data.habits) || !Array.isArray(data.daily) || !Array.isArray(data.weekly)) throw new Error('JSON público inválido.'); const serialized = JSON.stringify(data); for (const key of ['pageId', 'notionUrl', 'observations', 'habitRef', 'relation', 'privateRef']) if (serialized.includes(`"${key}"`)) throw new Error(`Campo privado detectado: ${key}`); return data; }
export async function writeHabitsJson(data, outputPath = OUTPUT_PATH) { validatePublicData(data); const tempPath = `${outputPath}.tmp`; await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); JSON.parse(await fs.readFile(tempPath, 'utf8')); await fs.rename(tempPath, outputPath); }

export async function runSync({ token = ENV.NOTION_TOKEN, habitsDataSourceId = ENV.NOTION_HABITS_DATABASE_ID, logsDataSourceId = ENV.NOTION_HABIT_LOG_DATABASE_ID, fetchImpl = fetch, outputPath = OUTPUT_PATH } = {}) {
  if (!token) return { status: 'skipped', reason: 'NOTION_TOKEN ausente; JSON público preservado.' };
  const [habitPages, logPages] = await Promise.all([fetchHabits({ token, habitsDataSourceId, fetchImpl }), fetchHabitLogs({ token, logsDataSourceId, fetchImpl })]);
  const habits = habitPages.map(page => ({ ...parseHabit(page), privateRef: page.id }));
  const nameByRef = new Map(habits.map(h => [h.privateRef, h.name]));
  const logs = logPages.map(page => { const item = parseHabitLog(page); return { ...item, habitName: nameByRef.get(item.habitRef) ?? null }; });
  const safe = validatePublicData(sanitizeHabits(aggregateHabits(habits, logs)));
  await writeHabitsJson(safe, outputPath);
  return { status: 'synced', activeHabits: safe.summary.activeHabits, records: logs.length };
}

async function main() { const result = await runSync(); console.log(result.status === 'synced' ? `Sincronização concluída: ${result.activeHabits} hábitos e ${result.records} registros agregados.` : result.reason); }
if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(`Sincronização falhou: ${error.message}`); process.exitCode = 1; });
