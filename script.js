// ================================
// CRICKET INTEL - MAIN SCRIPT v2.0
// ================================

// 🔥 API CONFIGURATION
const API_KEY = "c50a8e74-9f6b-4408-b3d4-007c61c408e1";
const BASE_URL = "https://api.cricapi.com/v1";

// ================================
// DOM ELEMENTS
// ================================

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const searchInput = document.getElementById('playerSearch');
const analyzeBtn = document.getElementById('analyzeBtn');
const playerResults = document.getElementById('playerResults');
const matchResults = document.getElementById('matchResults');
const refreshMatchesBtn = document.getElementById('refreshMatches');
const quickBtns = document.querySelectorAll('.quick-btn');
const compareBtn = document.getElementById('compareBtn');
const player1Input = document.getElementById('player1Input');
const player2Input = document.getElementById('player2Input');
const compareResults = document.getElementById('compareResults');

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🏏 Cricket Intel Initialized', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
    console.log('%cAPI Status: Connected ✅', 'color: #4CAF50;');
    console.log('%cAPI Key:', 'color: #FFD700;', API_KEY);
    
    // Check if elements exist
    if (!searchInput || !analyzeBtn) {
        console.error('❌ Critical elements missing!');
    }
});

// ================================
// TAB NAVIGATION
// ================================

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        
        // Remove active from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active to clicked
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        console.log(`Tab switched to: ${tabId}`);
        
        // Auto-load matches when switching to matches tab
        if (tabId === 'matches' && matchResults.innerHTML === '') {
            loadMatches();
        }
    });
});

// ================================
// SEARCH / QUICK ANALYZE
// ================================

if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
        const name = searchInput.value.trim();
        if (name) {
            searchPlayer(name);
        } else {
            showError(playerResults, "⚠️ Please enter a player name");
        }
    });
}

if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && analyzeBtn) {
            analyzeBtn.click();
        }
    });
}

// Quick search buttons
quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const player = btn.dataset.player;
        searchInput.value = player;
        searchPlayer(player);
    });
});

// ================================
// SEARCH PLAYER FUNCTION
// ================================

async function searchPlayer(name) {
    showLoading(playerResults, `Searching for ${name}...`);
    
    console.log(`🔍 Searching for: ${name}`);
    
    try {
        // Step 1: Search player by name
        const searchUrl = `${BASE_URL}/players?apikey=${API_KEY}&search=${encodeURIComponent(name)}`;
        console.log('API Call:', searchUrl);
        
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        
        console.log('Search Response:', searchData);
        
        // Check API response
        if (searchData.status !== "success") {
            throw new Error(searchData.msg || searchData.info || "API Error");
        }
        
        if (!searchData.data || searchData.data.length === 0) {
            showError(playerResults, `No player found for "${name}".<br>Try full name like "Virat Kohli"`);
            return;
        }
        
        const player = searchData.data[0];
        console.log('Found player:', player.name, 'ID:', player.id);
        
        // Step 2: Get detailed player info
        showLoading(playerResults, `Loading ${player.name}'s stats...`);
        
        const infoUrl = `${BASE_URL}/players_info?apikey=${API_KEY}&id=${player.id}`;
        console.log('Fetching details:', infoUrl);
        
        const infoRes = await fetch(infoUrl);
        const infoData = await infoRes.json();
        
        console.log('Player Info Response:', infoData);
        
        if (infoData.status !== "success") {
            throw new Error(infoData.msg || infoData.info || "Failed to load player info");
        }
        
        renderPlayer(playerResults, infoData.data);
        console.log('✅ Player rendered successfully');
        
    } catch (error) {
        console.error('❌ Error in searchPlayer:', error);
        showError(playerResults, `Error: ${error.message}<br><small>Check console (F12) for details</small>`);
    }
}

// ================================
// RENDER PLAYER CARD
// ================================

function renderPlayer(container, p) {
    const getStats = (format) => {
        if (!p.stats) return { matches: '-', runs: '-', batAvg: '-', wickets: '-', sr: '-', hundreds: '-', fifties: '-', innings: '-' };
        const stat = p.stats.find(s => s.fn === format);
        return stat || { matches: '-', runs: '-', batAvg: '-', wickets: '-', sr: '-', hundreds: '-', fifties: '-', innings: '-' };
    };

    const odi = getStats("odi");
    const t20 = getStats("t20");
    const test = getStats("test");

    container.innerHTML = `
        <div class="player-card fade-in-scale">
            <div class="player-header">
                <img src="${p.playerImg || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=140&background=4CAF50&color=fff&bold=true`}" 
                     alt="${p.name}" 
                     class="player-img"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=140&background=4CAF50&color=fff&bold=true'">
                <div class="player-info">
                    <h2>${p.name}</h2>
                    <p><strong>🌍 Country:</strong> ${p.country || 'N/A'}</p>
                    <p><strong>🎭 Role:</strong> ${p.role || 'N/A'}</p>
                    <p><strong>🏏 Batting:</strong> ${p.battingStyle || 'N/A'}</p>
                    <p><strong>⚡ Bowling:</strong> ${p.bowlingStyle || 'N/A'}</p>
                    <p><strong>🎂 Born:</strong> ${p.dateOfBirth || 'N/A'}</p>
                    ${p.placeOfBirth ? `<p><strong>📍 Birthplace:</strong> ${p.placeOfBirth}</p>` : ''}
                </div>
            </div>
            
            <div class="stats-container">
                ${createStatCard("🏏 ODI Stats", odi)}
                ${createStatCard("⚡ T20 Stats", t20)}
                ${createStatCard("🎯 Test Stats", test)}
            </div>
        </div>
    `;
}

function createStatCard(title, stats) {
    return `
        <div class="stat-card">
            <h3>${title}</h3>
            <table>
                <tr><td>Matches</td><td>${stats.matches || '-'}</td></tr>
                <tr><td>Innings</td><td>${stats.innings || '-'}</td></tr>
                <tr><td>Runs</td><td>${stats.runs || '-'}</td></tr>
                <tr><td>Average</td><td>${stats.batAvg || '-'}</td></tr>
                <tr><td>Strike Rate</td><td>${stats.sr || stats.strikeRate || '-'}</td></tr>
                <tr><td>100s / 50s</td><td>${stats.hundreds || '0'} / ${stats.fifties || '0'}</td></tr>
                <tr><td>Wickets</td><td>${stats.wickets || '-'}</td></tr>
                ${stats.bowlAvg ? `<tr><td>Bowl Avg</td><td>${stats.bowlAvg}</td></tr>` : ''}
            </table>
        </div>
    `;
}

// ================================
// LIVE MATCHES
// ================================

if (refreshMatchesBtn) {
    refreshMatchesBtn.addEventListener('click', loadMatches);
}

async function loadMatches() {
    showLoading(matchResults, "Loading matches...");
    
    console.log('📺 Fetching live matches...');
    
    try {
        const matchesUrl = `${BASE_URL}/currentMatches?apikey=${API_KEY}`;
        console.log('API Call:', matchesUrl);
        
        const response = await fetch(matchesUrl);
        const data = await response.json();
        
        console.log('Matches Response:', data);
        
        if (data.status !== "success") {
            throw new Error(data.msg || data.info || "Failed to load matches");
        }
        
        if (!data.data || data.data.length === 0) {
            matchResults.innerHTML = `
                <div style="text-align:center; padding:40px; color:#888;">
                    <h3 style="font-size:24px; margin-bottom:10px;">📭 No Matches Found</h3>
                    <p>There are no live or upcoming matches at the moment.</p>
                </div>
            `;
            return;
        }
        
        renderMatches(data.data);
        console.log(`✅ Rendered ${data.data.length} matches`);
        
    } catch (error) {
        console.error('❌ Error in loadMatches:', error);
        showError(matchResults, `Error: ${error.message}`);
    }
}

function renderMatches(matches) {
    matchResults.innerHTML = matches.slice(0, 20).map((m, index) => {
        const isLive = m.matchStarted && !m.matchEnded;
        
        return `
            <div class="match-card" style="animation-delay: ${index * 0.05}s">
                <h3>${m.name || 'Match'}</h3>
                <p><strong>🏆 Type:</strong> ${m.matchType || 'N/A'}</p>
                <p><strong>📍 Venue:</strong> ${m.venue || 'TBA'}</p>
                <p><strong>📅 Date:</strong> ${formatDate(m.dateTimeGMT)}</p>
                ${m.score && m.score.length > 0 ? `<p><strong>📊 Score:</strong> ${formatScore(m.score)}</p>` : ''}
                ${m.teams && m.teams.length === 2 ? `<p><strong>⚔️ Teams:</strong> ${m.teams.join(' vs ')}</p>` : ''}
                <span class="match-status ${isLive ? 'live' : ''}">${isLive ? '🔴 LIVE' : (m.status || 'Scheduled')}</span>
            </div>
        `;
    }).join('');
}

function formatScore(scores) {
    if (!scores || !Array.isArray(scores)) return 'N/A';
    return scores.map(s => {
        if (s.r !== undefined && s.w !== undefined && s.o !== undefined) {
            return `${s.inning || 'Team'}: ${s.r}/${s.w} (${s.o})`;
        }
        return '';
    }).filter(s => s).join(' | ') || 'Score pending';
}

function formatDate(dateStr) {
    if (!dateStr) return 'TBA';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    } catch {
        return dateStr;
    }
}

// ================================
// COMPARE PLAYERS
// ================================

if (compareBtn) {
    compareBtn.addEventListener('click', async () => {
        const name1 = player1Input.value.trim();
        const name2 = player2Input.value.trim();
        
        if (!name1 || !name2) {
            showError(compareResults, "⚠️ Please enter both player names");
            return;
        }
        
        showLoading(compareResults, "Comparing players...");
        console.log(`⚔️ Comparing: ${name1} vs ${name2}`);
        
        try {
            // Fetch both players in parallel
            const [player1, player2] = await Promise.all([
                fetchPlayerData(name1),
                fetchPlayerData(name2)
            ]);
            
            if (!player1) {
                showError(compareResults, `Could not find player: "${name1}"`);
                return;
            }
            
            if (!player2) {
                showError(compareResults, `Could not find player: "${name2}"`);
                return;
            }
            
            renderComparison(player1, player2);
            console.log('✅ Comparison rendered');
            
        } catch (error) {
            console.error('❌ Error in compare:', error);
            showError(compareResults, `Error: ${error.message}`);
        }
    });
}

async function fetchPlayerData(name) {
    try {
        // Search player
        const searchRes = await fetch(`${BASE_URL}/players?apikey=${API_KEY}&search=${encodeURIComponent(name)}`);
        const searchData = await searchRes.json();
        
        if (searchData.status !== "success" || !searchData.data || searchData.data.length === 0) {
            return null;
        }
        
        const playerId = searchData.data[0].id;
        
        // Get details
        const infoRes = await fetch(`${BASE_URL}/players_info?apikey=${API_KEY}&id=${playerId}`);
        const infoData = await infoRes.json();
        
        if (infoData.status !== "success") {
            return null;
        }
        
        return infoData.data;
    } catch (error) {
        console.error(`Error fetching ${name}:`, error);
        return null;
    }
}

function renderComparison(p1, p2) {
    compareResults.innerHTML = `
        <div class="player-card fade-in-scale">
            ${renderComparePlayer(p1)}
        </div>
        <div class="player-card fade-in-scale" style="animation-delay: 0.1s">
            ${renderComparePlayer(p2)}
        </div>
    `;
}

function renderComparePlayer(p) {
    const getStats = (format) => {
        if (!p.stats) return { matches: '-', runs: '-', batAvg: '-', wickets: '-', sr: '-' };
        return p.stats.find(s => s.fn === format) || { matches: '-', runs: '-', batAvg: '-', wickets: '-', sr: '-' };
    };

    const odi = getStats("odi");
    const t20 = getStats("t20");

    return `
        <div class="player-header" style="flex-direction:column; text-align:center;">
            <img src="${p.playerImg || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=120&background=4CAF50&color=fff&bold=true`}" 
                 alt="${p.name}" 
                 class="player-img"
                 style="width:120px; height:120px;"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=120&background=4CAF50&color=fff&bold=true'">
            <div class="player-info">
                <h2 style="font-size:24px;">${p.name}</h2>
                <p><strong>${p.country || 'N/A'}</strong> | ${p.role || 'N/A'}</p>
            </div>
        </div>
        <div class="stats-container" style="grid-template-columns: 1fr;">
            ${createStatCard("🏏 ODI", odi)}
            ${createStatCard("⚡ T20", t20)}
        </div>
    `;
}

// ================================
// UTILITY FUNCTIONS
// ================================

function showLoading(container, message) {
    if (!container) return;
    container.innerHTML = `
        <div class="loading fade-in-scale">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

function showError(container, message) {
    if (!container) return;
    container.innerHTML = `
        <div class="error fade-in-scale">
            <h3>⚠️ Oops!</h3>
            <p>${message}</p>
            <p style="font-size:12px; margin-top:12px; opacity:0.7;">
                Tip: Open Developer Console (F12) for more details
            </p>
        </div>
    `;
}

// ================================
// ERROR HANDLING
// ================================

window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

// ================================
// CONSOLE WELCOME MESSAGE
// ================================

console.log(`
%c╔══════════════════════════════════════╗
║     🏏 CRICKET INTEL v2.0 🏏        ║
║                                      ║
║  Built with ❤️ for Cricket Fans     ║
║  API: CricketData.org                ║
║  GitHub: spartan13292-sudo           ║
╚══════════════════════════════════════╝
`, 'color: #4CAF50; font-weight: bold;');