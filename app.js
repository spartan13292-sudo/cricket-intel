/* ============================================================
   CricIntel — App Logic
   ============================================================ */

let sessionPredictions = 0;
let selected1 = null;
let selected2 = null;
let lastAnalysis = null;

/* ---------- QUICK MATCHES ---------- */
const QUICK_FIXTURES = [
  ['mi','csk',0], ['rcb','kkr',1], ['gt','rr',5],
  ['dc','pbks',4], ['srh','lsg',7], ['csk','rcb',2],
];

function teamBadge(team, size){
  size = size || 32;
  return `<div class="qm-badge" style="width:${size}px;height:${size}px;background:${team.color};color:${team.text};">${team.abbr}</div>`;
}

function renderQuickMatches(){
  const box = document.getElementById('quickMatches');
  box.innerHTML = QUICK_FIXTURES.map(([id1, id2, vIdx]) => {
    const t1 = TEAMS.find(t => t.id === id1), t2 = TEAMS.find(t => t.id === id2);
    const venue = VENUES[vIdx];
    return `<button type="button" class="quick-match" data-t1="${id1}" data-t2="${id2}" data-v="${vIdx}">
      <div class="qm-teams">
        ${teamBadge(t1)}
        <span class="qm-vs">VS</span>
        ${teamBadge(t2)}
      </div>
      <div class="qm-venue">📍 ${venue.name}, ${venue.city}</div>
      <div class="qm-format">T20 · IPL 2026</div>
    </button>`;
  }).join('');

  box.querySelectorAll('.quick-match').forEach(el => {
    el.addEventListener('click', () => {
      const t1 = TEAMS.find(t => t.id === el.dataset.t1);
      const t2 = TEAMS.find(t => t.id === el.dataset.t2);
      const venue = VENUES[parseInt(el.dataset.v, 10)];
      selected1 = t1; selected2 = t2;
      document.getElementById('venueSelect').value = String(VENUES.indexOf(venue));
      updateMatchupUI();
      runAnalysis(venue);
    });
  });
}

/* ---------- TEAM PICKER ---------- */
function renderTeamGrid(){
  const grid = document.getElementById('teamGrid');
  grid.innerHTML = TEAMS.map(t => `
    <button type="button" class="team-card" data-id="${t.id}" aria-label="${t.name}">
      <div class="team-card-tag" data-tag></div>
      <div class="team-card-badge" style="background:${t.color};color:${t.text};">${t.abbr}</div>
      <div class="team-card-name">${t.name}</div>
    </button>`).join('');

  grid.querySelectorAll('.team-card').forEach(card => {
    card.addEventListener('click', () => {
      const team = TEAMS.find(t => t.id === card.dataset.id);
      if (selected1 && selected1.id === team.id){ selected1 = null; }
      else if (selected2 && selected2.id === team.id){ selected2 = null; }
      else if (!selected1){ selected1 = team; }
      else if (!selected2){ selected2 = team; }
      else { selected1 = team; selected2 = null; } // start fresh
      updateMatchupUI();
    });
  });
}

/** Fills a "Team 1" / "Team 2" summary slot with the currently picked team,
 *  or a placeholder prompt if nothing's picked yet for that slot. */
function renderSlot(elId, team, num){
  const el = document.getElementById(elId);
  if (team){
    el.classList.remove('empty');
    el.innerHTML = `<div class="slot-eyebrow">Team ${num}</div>
      <div class="slot-content" style="color:${team.color};">${team.name}</div>
      <div class="slot-sub">${team.abbr}</div>`;
  } else {
    el.classList.add('empty');
    el.innerHTML = `<div class="slot-eyebrow">Team ${num}</div><div class="slot-content">Tap a team below</div>`;
  }
}

/** Single source of truth for reflecting selected1/selected2 across the UI:
 *  the team-card grid (ring + TEAM 1/2 tag), the matchup summary bar,
 *  and the enabled state of the swap/clear/run controls. */
function updateMatchupUI(){
  document.querySelectorAll('.team-card').forEach(card => {
    const id = card.dataset.id;
    const isT1 = !!(selected1 && selected1.id === id);
    const isT2 = !!(selected2 && selected2.id === id);
    card.classList.toggle('is-team1', isT1);
    card.classList.toggle('is-team2', isT2);
    card.querySelector('[data-tag]').textContent = isT1 ? 'TEAM 1' : isT2 ? 'TEAM 2' : '';
  });

  renderSlot('slot1', selected1, 1);
  renderSlot('slot2', selected2, 2);

  document.getElementById('swapBtn').disabled = !(selected1 && selected2);
  document.getElementById('runBtn').disabled = !(selected1 && selected2);
  document.getElementById('clearPicksBtn').style.display = (selected1 || selected2) ? 'inline-flex' : 'none';
}

document.getElementById('swapBtn').addEventListener('click', () => {
  if (!selected1 || !selected2) return;
  const tmp = selected1; selected1 = selected2; selected2 = tmp;
  updateMatchupUI();
});

document.getElementById('clearPicksBtn').addEventListener('click', () => {
  selected1 = null; selected2 = null;
  updateMatchupUI();
});

/* ---------- VENUE SELECT ---------- */
function renderVenueSelect(selectEl){
  selectEl.innerHTML = VENUES.map((v, i) => `<option value="${i}">${v.name}, ${v.city}</option>`).join('');
}

/* ---------- RUN ANALYSIS (loading overlay -> results) ---------- */
const LOADING_STEPS = ['Fetching player data...', 'Reading pitch history...', 'Checking weather...', 'Building Fantasy XI...', 'Writing video script...'];

function runAnalysis(venueOverride){
  const err = document.getElementById('dashErr');
  err.classList.remove('show'); err.textContent = '';

  if (!selected1 || !selected2){
    err.textContent = 'Pick two different teams first.'; err.classList.add('show'); return;
  }
  if (selected1.id === selected2.id){
    err.textContent = 'Pick two different teams.'; err.classList.add('show'); return;
  }

  const venue = venueOverride || VENUES[parseInt(document.getElementById('venueSelect').value, 10)];
  const overlay = document.getElementById('loadingOverlay');
  const stepEl = document.getElementById('loadingStep');
  overlay.classList.add('show');

  let step = 0;
  stepEl.textContent = LOADING_STEPS[0];
  const interval = setInterval(() => {
    step++;
    if (step < LOADING_STEPS.length){ stepEl.textContent = LOADING_STEPS[step]; }
  }, 260);

  setTimeout(() => {
    clearInterval(interval);
    overlay.classList.remove('show');
    lastAnalysis = generateAnalysis(selected1, selected2, venue);
    renderResults(lastAnalysis);
    sessionPredictions++;
    document.getElementById('statPred').textContent = String(sessionPredictions);
  }, 1450);
}

/* ---------- RENDER RESULTS ---------- */
function renderResults(data){
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('resultsGrid').style.display = 'grid';

  const { team1, team2, venue, winProb, fantasyXI, fullSquad, weather, h2h, form } = data;

  // Win probability
  document.getElementById('winProbBox').innerHTML = `
    <div class="prob-teams">
      <div class="prob-team t1">${team1.abbr}</div>
      <div class="prob-track"><div class="prob-fill" id="probFill"></div></div>
      <div class="prob-team t2">${team2.abbr}</div>
    </div>
    <div class="prob-pcts"><span>${winProb.p1}%</span><span>${winProb.p2}%</span></div>
    <div class="winner-line">🏆 ${winProb.winner.name} favoured to win by a ${winProb.margin}-point margin, based on real head-to-head history, recent form and venue.</div>`;
  requestAnimationFrame(() => { document.getElementById('probFill').style.width = winProb.p1 + '%'; });

  // Pitch report
  document.getElementById('pitchVisual').innerHTML = `
    <div class="pitch-oval"><div class="pitch-oval-fill"></div><div class="pitch-type-badge">${venue.type}</div></div>
    <div class="pitch-info">
      <div class="pitch-score-range">${venue.range}</div>
      <div style="font-size:11px;color:var(--muted);">Expected 1st innings score at ${venue.name}</div>
    </div>`;
  document.getElementById('pitchTags').innerHTML = venue.tags.map(t => `<div class="pitch-tag">${t}</div>`).join('');

  // Weather
  document.getElementById('weatherRow').innerHTML = weather.map(w => `
    <div class="weather-item"><div class="weather-icon">${w.icon}</div><div class="weather-val">${w.val}</div><div class="weather-key">${w.key}</div></div>`).join('');

  // Fantasy XI (top picks grid)
  document.getElementById('playersGrid').innerHTML = fantasyXI.map((p, i) => `
    <div class="player-row">
      <div class="player-avatar ${p.role.toLowerCase()}" style="background:${p.teamColor}22;">${roleIcon(p.role)}</div>
      <div class="player-info">
        <div class="player-name">${p.name}</div>
        <div class="player-meta">${p.team} · ${p.role} · ${p.credits}cr</div>
      </div>
      ${i === 0 ? '<div class="player-badge c">C</div>' : i === 1 ? '<div class="player-badge vc">VC</div>' : ''}
    </div>`).join('');

  // Full squad fantasy table
  document.getElementById('fantasyTableBody').innerHTML = fullSquad
    .slice().sort((a, b) => b.pts - a.pts)
    .map(p => `<tr><td>${p.name}</td><td><span class="role-pill ${p.role}">${p.role}</span></td><td>${p.team}</td><td>${p.credits}</td><td>${p.pts}</td></tr>`).join('');

  // Script
  document.getElementById('scriptBox').textContent = buildScript(data);

  // H2H (real all-time record; guard against teams that have never met)
  const h2hDecided = h2h.t1 + h2h.t2;
  const h2hPct1 = h2hDecided > 0 ? Math.round((h2h.t1 / h2hDecided) * 100) : 50;
  document.getElementById('h2hBox').innerHTML = `
    <div class="h2h-bar"><div class="h2h-t1" style="width:${h2hPct1}%;"></div><div class="h2h-t2" style="width:${100 - h2hPct1}%;"></div></div>
    <div class="h2h-labels"><span>${team1.abbr} · ${h2h.t1}W</span><span>${team2.abbr} · ${h2h.t2}W</span></div>
    <div class="h2h-detail">${h2h.detail}</div>`;

  // Live data banner (only appears if a free API key is configured in api.js
  // AND this exact fixture is currently live/scheduled today)
  const liveBox = document.getElementById('liveBanner');
  if (liveBox){
    liveBox.style.display = 'none';
    liveBox.innerHTML = '';
    if (window.CricLive && CricLive.enabled()){
      CricLive.findMatch(team1, team2).then(m => {
        if (!m) return;
        liveBox.style.display = 'block';
        liveBox.innerHTML = `
          <div class="live-banner-tag">🔴 LIVE DATA · via free CricAPI</div>
          <div class="live-banner-title">${m.name || (team1.abbr + ' vs ' + team2.abbr)}</div>
          <div class="live-banner-status">${m.status || ''}</div>`;
      }).catch(() => {});
    }
  }

  // Form
  document.getElementById('formBox').innerHTML = [
    { team: team1, dots: form.t1 },
    { team: team2, dots: form.t2 },
  ].map(row => `
    <div class="form-row">
      <div class="form-team-name" style="color:${row.team.color};">${row.team.abbr}</div>
      <div class="form-dots">${row.dots.map(d => `<div class="form-dot ${d}">${d.toUpperCase()}</div>`).join('')}</div>
    </div>`).join('');
}

function roleIcon(role){
  return { BAT:'🏏', BOWL:'🎯', ALL:'🌀', WK:'🧤' }[role] || '🏏';
}

/* ---------- SCRIPT ACTIONS ---------- */
document.getElementById('copyScriptBtn').addEventListener('click', () => {
  const text = document.getElementById('scriptBox').textContent;
  const btn = document.getElementById('copyScriptBtn');
  const flash = (label) => {
    const original = btn.textContent;
    btn.textContent = label;
    setTimeout(() => { btn.textContent = original; }, 1500);
  };
  if (navigator.clipboard?.writeText){
    navigator.clipboard.writeText(text).then(() => flash('✅ Copied!')).catch(() => fallbackCopy(text, flash));
  } else {
    fallbackCopy(text, flash);
  }
});

function fallbackCopy(text, flash){
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); flash('✅ Copied!'); }
  catch (e) { flash('⚠️ Copy failed'); }
  document.body.removeChild(ta);
}
document.getElementById('regenScriptBtn').addEventListener('click', () => {
  if (lastAnalysis){ document.getElementById('scriptBox').textContent = buildScript(lastAnalysis); }
});

document.getElementById('runBtn').addEventListener('click', () => runAnalysis());

/* ---------- INIT ---------- */
renderQuickMatches();
renderTeamGrid();
renderVenueSelect(document.getElementById('venueSelect'));
updateMatchupUI();
