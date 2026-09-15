import { DataProvider } from './data-provider.js';

export const routes = [
  ['home','Visão geral','index.html'],['habits','Hábitos','habits.html'],['finances','Finanças','finances.html'],['studies','Estudos','studies.html'],['roadmap','Roadmap','roadmap.html'],['work','Trabalho','work.html']
];

export function initShell() {
  const page = document.body.dataset.page;
  const embedded = new URLSearchParams(location.search).get('embed') === 'true';
  if (embedded) document.body.classList.add('embed');
  const shell = document.querySelector('[data-shell]');
  if (shell) shell.innerHTML = `<nav class="nav" aria-label="Navegação principal"><a class="brand" href="index.html" aria-label="Projeto de Vida, início"><span class="brand-mark"></span>PROJETO DE VIDA</a><div class="nav-links">${routes.map(([key,label,url])=>`<a class="${page===key?'active':''}" href="${url}${embedded?'?embed=true':''}">${label}</a>`).join('')}</div><span class="nav-status"><i></i> Sistema ativo</span></nav>`;
}

function kpiCard(item) { return `<article class="kpi-card"><div class="kpi-top"><span class="kpi-icon">${item.icon}</span>${item.badge?`<span class="demo-badge">${item.badge}</span>`:''}</div><p class="kpi-label">${item.label}</p><strong class="kpi-value">${item.value}</strong>${item.progress!=null?`<div class="progress-track" style="margin-top:12px"><span style="--progress:${item.progress}%"></span></div>`:''}<small class="kpi-sub">${item.sub||''}</small></article>`; }

async function initHome() {
  try {
    const data = await DataProvider.get('dashboard');
    document.querySelector('#home-kpis').innerHTML = data.kpis.map(kpiCard).join('');
    document.querySelector('#area-grid').innerHTML = data.areas.map(a=>`<a class="area-card" href="${a.url}" aria-label="Abrir ${a.name}"><div class="area-visual" style="--base:${a.base};--glow:${a.glow}"></div><div class="area-content"><span class="area-icon">${a.icon}</span><h3>${a.name}</h3><p>${a.description}</p><span class="area-arrow">↗</span></div></a>`).join('');
  } catch { document.querySelector('#home-kpis').innerHTML='<p>Não foi possível carregar os dados demonstrativos.</p>'; }
}

initShell();
if (document.body.dataset.page === 'home') initHome();
