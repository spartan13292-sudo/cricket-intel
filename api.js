/* ============================================================
   CricIntel — Live Data Layer (OPTIONAL, free)
   ============================================================
   This file plugs a real, free cricket API into the app. Everything
   else (predictions, Fantasy XI, points, scripts) keeps working from
   the local seeded model in data.js even if you never touch this file
   — this only adds a "🔴 LIVE" banner when a selected fixture is
   actually live or scheduled today.

   FREE API USED: CricAPI (by cricketdata.org)
     1. Go to https://cricketdata.org/member.aspx and sign up (free).
     2. Copy your API key from the dashboard.
     3. Paste it below as CRICAPI_KEY.
     Free tier: 100 requests/day, current matches + schedule + scorecards.
     Docs: https://cricketdata.org/how-to-use-cricket-data-api.aspx

   ⚠️ Note for publishing on GitHub Pages: this is a static site, so
   the key is visible to anyone who views the page source. That's
   fine for a hobby/free-tier key with a 100/day cap, but don't paste
   a paid key into a public repo. If you outgrow this, proxy the call
   through a small serverless function instead of calling the API
   directly from the browser.
   ============================================================ */

const CRICAPI_KEY = '19b05836-ec9c-497b-9945-f4081c31943c'; // <-- paste your free cricketdata.org API key here (leave blank to stay simulation-only)

const CricLive = (function(){
  const CACHE_MS = 5 * 60 * 1000; // don't hammer the free 100/day quota
  let cache = null;
  let cacheTime = 0;

  // team id -> tokens CricAPI is likely to use in its "teams" / "name" strings
  const TEAM_TOKENS = {
    csk:  ['chennai', 'super kings'],
    mi:   ['mumbai', 'indians'],
    rcb:  ['bengaluru', 'bangalore', 'royal challengers'],
    kkr:  ['kolkata', 'knight riders'],
    dc:   ['delhi', 'capitals'],
    pbks: ['punjab', 'kings'],
    rr:   ['rajasthan', 'royals'],
    srh:  ['sunrisers', 'hyderabad'],
    gt:   ['gujarat', 'titans'],
    lsg:  ['lucknow', 'super giants'],
  };

  function enabled(){
    return !!CRICAPI_KEY;
  }

  async function currentMatches(){
    if (!enabled()) return null;
    if (cache && (Date.now() - cacheTime) < CACHE_MS) return cache;
    try {
      const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${CRICAPI_KEY}&offset=0`);
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.data)){
        console.warn('CricIntel live: API responded but with no usable data', json);
        return null;
      }
      cache = json.data;
      cacheTime = Date.now();
      return cache;
    } catch (err){
      console.warn('CricIntel live: fetch failed, staying in simulation mode', err);
      return null;
    }
  }

  function matchMentionsTeam(match, teamId){
    const tokens = TEAM_TOKENS[teamId] || [];
    const haystack = [
      match.name || '',
      ...(Array.isArray(match.teams) ? match.teams : []),
    ].join(' ').toLowerCase();
    return tokens.some(t => haystack.includes(t));
  }

  /** Returns the live/upcoming-today CricAPI match object for this exact
   *  fixture, or null if there isn't one (most of the time — that's normal). */
  async function findMatch(team1, team2){
    const matches = await currentMatches();
    if (!matches) return null;
    const candidates = matches.filter(m => matchMentionsTeam(m, team1.id) && matchMentionsTeam(m, team2.id));
    if (candidates.length === 0) return null;
    // prefer one that's explicitly tagged as IPL, otherwise take the first match
    const iplMatch = candidates.find(m => /ipl|indian premier league/i.test(m.name || ''));
    return iplMatch || candidates[0];
  }

  return { enabled, currentMatches, findMatch };
})();
