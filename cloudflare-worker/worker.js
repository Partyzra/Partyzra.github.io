const DEFAULT_SITE_ORIGIN = 'https://partyzra.github.io';
const MAX_BODY_BYTES = 8_000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      try {
        await env.DB.prepare('SELECT 1 AS ok').run();
        return json({ ok: true, service: 'partyzra-analytics' }, 200, {
          'Cache-Control': 'no-store'
        });
      } catch (_) {
        return json({ ok: false, error: 'database_unavailable' }, 503, {
          'Cache-Control': 'no-store'
        });
      }
    }

    if (url.pathname === '/track') {
      return handleTrack(request, env);
    }

    if (url.pathname === '/dashboard' || url.pathname === '/') {
      if (!isDashboardAuthorized(request, env)) return authRequired();
      return renderDashboard(env);
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleTrack(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = getAllowedOrigins(env);
  const isAllowed = allowedOrigins.has(origin);

  if (request.method === 'OPTIONS') {
    if (!isAllowed) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin)
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'POST, OPTIONS' }
    });
  }

  if (!isAllowed) return new Response('Origin not allowed', { status: 403 });

  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return withCors(json({ ok: false, error: 'payload_too_large' }, 413), origin);
  }

  let payload;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new Error('too_large');
    payload = JSON.parse(raw);
  } catch (_) {
    return withCors(json({ ok: false, error: 'invalid_json' }, 400), origin);
  }

  const eventType = clean(payload.event_type, 40);
  const page = clean(payload.page, 180);
  const item = clean(payload.item, 240);
  const label = clean(payload.label, 240);
  const referrer = cleanReferrer(payload.referrer);
  const sessionId = clean(payload.session_id, 64);

  if (!['page_view', 'photo_view', 'custom_event'].includes(eventType)) {
    return withCors(json({ ok: false, error: 'invalid_event_type' }, 400), origin);
  }

  if (!/^[-a-zA-Z0-9]{8,64}$/.test(sessionId)) {
    return withCors(json({ ok: false, error: 'invalid_session' }, 400), origin);
  }

  if (!page.startsWith('/')) {
    return withCors(json({ ok: false, error: 'invalid_page' }, 400), origin);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO events (event_type, page, item, label, referrer, session_id)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `).bind(eventType, page, item || null, label || null, referrer || null, sessionId).run();
  } catch (_) {
    return withCors(json({ ok: false, error: 'database_write_failed' }, 500), origin);
  }

  return withCors(json({ ok: true }, 202), origin);
}

function getAllowedOrigins(env) {
  const raw = clean(env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN, 500);
  return new Set(raw.split(',').map(v => v.trim()).filter(Boolean));
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(origin)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function isDashboardAuthorized(request, env) {
  const expectedPassword = String(env.DASHBOARD_PASSWORD || '');
  if (!expectedPassword) return false;

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Basic ')) return false;

  try {
    const decoded = atob(auth.slice(6));
    const splitAt = decoded.indexOf(':');
    if (splitAt < 0) return false;
    const username = decoded.slice(0, splitAt);
    const password = decoded.slice(splitAt + 1);
    const expectedUser = String(env.DASHBOARD_USER || 'admin');
    return safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
  } catch (_) {
    return false;
  }
}

function safeEqual(a, b) {
  const aa = new TextEncoder().encode(String(a));
  const bb = new TextEncoder().encode(String(b));
  let diff = aa.length ^ bb.length;
  const max = Math.max(aa.length, bb.length);
  for (let i = 0; i < max; i += 1) diff |= (aa[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}

function authRequired() {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Partyzra Analytics", charset="UTF-8"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

async function renderDashboard(env) {
  try {
    const [totals, pages, photos, daily, recent] = await Promise.all([
      queryTotals(env),
      queryRows(env, `
        SELECT page, COUNT(*) AS views
        FROM events
        WHERE event_type = 'page_view'
        GROUP BY page
        ORDER BY views DESC
      `),
      queryRows(env, `
        SELECT item, COALESCE(MAX(label), item) AS label, COUNT(*) AS views
        FROM events
        WHERE event_type = 'photo_view'
        GROUP BY item
        ORDER BY views DESC, item ASC
        LIMIT 20
      `),
      queryRows(env, `
        WITH RECURSIVE days(day) AS (
          SELECT date('now', '-29 days')
          UNION ALL
          SELECT date(day, '+1 day') FROM days WHERE day < date('now')
        )
        SELECT
          days.day AS day,
          COALESCE(SUM(CASE WHEN e.event_type = 'page_view' THEN 1 ELSE 0 END), 0) AS page_views,
          COALESCE(SUM(CASE WHEN e.event_type = 'photo_view' THEN 1 ELSE 0 END), 0) AS photo_views
        FROM days
        LEFT JOIN events e ON date(e.created_at) = days.day
        GROUP BY days.day
        ORDER BY days.day ASC
      `),
      queryRows(env, `
        SELECT event_type, page, item, label, referrer, created_at
        FROM events
        ORDER BY id DESC
        LIMIT 15
      `)
    ]);

    const html = dashboardHtml({ totals, pages, photos, daily, recent });
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
      }
    });
  } catch (error) {
    return new Response(`Dashboard error: ${escapeHtml(error?.message || 'unknown error')}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' }
    });
  }
}

async function queryTotals(env) {
  const rows = await queryRows(env, `
    SELECT
      COUNT(*) AS total_events,
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event_type = 'photo_view' THEN 1 ELSE 0 END) AS photo_views,
      COUNT(DISTINCT session_id) AS sessions,
      SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS events_30d,
      SUM(CASE WHEN event_type = 'page_view' AND created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS page_views_30d,
      SUM(CASE WHEN event_type = 'photo_view' AND created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS photo_views_30d,
      COUNT(DISTINCT CASE WHEN created_at >= datetime('now', '-30 days') THEN session_id END) AS sessions_30d,
      SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS events_today
    FROM events
  `);
  return rows[0] || {};
}

async function queryRows(env, sql, ...values) {
  const statement = env.DB.prepare(sql);
  const result = values.length ? await statement.bind(...values).run() : await statement.run();
  return result.results || [];
}

function dashboardHtml({ totals, pages, photos, daily, recent }) {
  const number = value => Number(value || 0).toLocaleString('en-US');
  const maxDaily = Math.max(1, ...daily.map(d => Number(d.page_views || 0) + Number(d.photo_views || 0)));

  const dailyBars = daily.map(d => {
    const total = Number(d.page_views || 0) + Number(d.photo_views || 0);
    const height = Math.max(total ? 6 : 2, Math.round((total / maxDaily) * 100));
    return `<div class="bar-wrap" title="${escapeHtml(d.day)} — ${number(total)} events"><div class="bar" style="height:${height}%"></div></div>`;
  }).join('');

  const photoRows = photos.length ? photos.map((row, index) => `
    <div class="rank-row">
      <span class="rank">${String(index + 1).padStart(2, '0')}</span>
      <span class="rank-main"><strong>${escapeHtml(row.label || row.item || 'Untitled')}</strong><small>${escapeHtml(row.item || '')}</small></span>
      <span class="rank-value">${number(row.views)}</span>
    </div>`).join('') : '<p class="empty">No photo views yet.</p>';

  const pageRows = pages.length ? pages.map(row => `
    <div class="rank-row compact">
      <span class="rank-main"><strong>${escapeHtml(prettyPage(row.page))}</strong><small>${escapeHtml(row.page || '')}</small></span>
      <span class="rank-value">${number(row.views)}</span>
    </div>`).join('') : '<p class="empty">No page views yet.</p>';

  const recentRows = recent.length ? recent.map(row => `
    <tr>
      <td>${escapeHtml(formatUtc(row.created_at))}</td>
      <td>${escapeHtml(row.event_type || '')}</td>
      <td>${escapeHtml(row.label || row.item || prettyPage(row.page))}</td>
      <td>${escapeHtml(shortReferrer(row.referrer))}</td>
    </tr>`).join('') : '<tr><td colspan="4" class="empty">No events yet.</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Partyzra / Analytics</title>
<style>
  :root{color-scheme:dark;--bg:#08090a;--panel:#0f1113;--line:#25282c;--muted:#858b92;--text:#f2f3f4;--soft:#c6c9cc}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:44px 0 80px}.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:34px}.eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}.top h1{font-size:clamp(32px,5vw,62px);line-height:.95;letter-spacing:-.055em;margin:0;font-weight:500}.stamp{font-size:12px;color:var(--muted);text-align:right}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}.card,.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px}.card{padding:20px;min-height:126px;display:flex;flex-direction:column;justify-content:space-between}.label{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.14em}.value{font-size:clamp(30px,4vw,50px);letter-spacing:-.055em}.sub{color:var(--muted);font-size:12px}
  .grid{display:grid;grid-template-columns:1.45fr 1fr;gap:10px}.panel{padding:22px;min-width:0}.panel h2{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--soft);font-weight:500;margin:0 0 20px}.chart{height:190px;display:flex;align-items:flex-end;gap:4px;border-bottom:1px solid var(--line);padding-top:8px}.bar-wrap{height:100%;flex:1;display:flex;align-items:flex-end;min-width:2px}.bar{width:100%;background:#e6e8ea;border-radius:2px 2px 0 0;opacity:.78}.chart-note{display:flex;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--muted)}
  .rank-row{display:grid;grid-template-columns:32px 1fr auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}.rank-row:first-of-type{border-top:0}.rank-row.compact{grid-template-columns:1fr auto}.rank{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}.rank-main{min-width:0}.rank-main strong,.rank-main small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rank-main strong{font-size:13px;font-weight:500}.rank-main small{font-size:10px;color:var(--muted);margin-top:3px}.rank-value{font-size:13px;font-variant-numeric:tabular-nums}.split{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
  .table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:.1em;padding:0 12px 10px 0}td{padding:10px 12px 10px 0;border-top:1px solid var(--line);color:var(--soft);white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}.empty{color:var(--muted);font-size:12px}.foot{margin-top:18px;color:var(--muted);font-size:11px;line-height:1.55}
  @media(max-width:800px){main{width:min(100% - 20px,1180px);padding-top:24px}.top{align-items:flex-start;flex-direction:column}.stamp{text-align:left}.cards{grid-template-columns:1fr 1fr}.grid,.split{grid-template-columns:1fr}.chart{height:150px}.panel{padding:17px}}
</style>
</head>
<body>
<main>
  <header class="top">
    <div><p class="eyebrow">Private dashboard</p><h1>PARTYZRA / ANALYTICS</h1></div>
    <div class="stamp">UTC data<br>Refresh the page for current totals</div>
  </header>

  <section class="cards">
    <article class="card"><span class="label">Sessions</span><span class="value">${number(totals.sessions)}</span><span class="sub">${number(totals.sessions_30d)} in last 30 days</span></article>
    <article class="card"><span class="label">Page views</span><span class="value">${number(totals.page_views)}</span><span class="sub">${number(totals.page_views_30d)} in last 30 days</span></article>
    <article class="card"><span class="label">Photo opens</span><span class="value">${number(totals.photo_views)}</span><span class="sub">${number(totals.photo_views_30d)} in last 30 days</span></article>
    <article class="card"><span class="label">Events today</span><span class="value">${number(totals.events_today)}</span><span class="sub">${number(totals.total_events)} all-time events</span></article>
  </section>

  <section class="grid">
    <article class="panel">
      <h2>Last 30 days</h2>
      <div class="chart">${dailyBars}</div>
      <div class="chart-note"><span>${escapeHtml(daily[0]?.day || '')}</span><span>page views + photo opens</span><span>${escapeHtml(daily[daily.length - 1]?.day || '')}</span></div>
    </article>
    <article class="panel"><h2>Pages</h2>${pageRows}</article>
  </section>

  <section class="split">
    <article class="panel"><h2>Top photographs</h2>${photoRows}</article>
    <article class="panel">
      <h2>Recent activity</h2>
      <div class="table-wrap"><table><thead><tr><th>Time</th><th>Type</th><th>Item</th><th>Referrer</th></tr></thead><tbody>${recentRows}</tbody></table></div>
    </article>
  </section>

  <p class="foot">Version 1 stores anonymous session IDs, page/photo events, timestamps, and referrers. It does not intentionally store names, email addresses, precise location, IP addresses, or browser fingerprints.</p>
</main>
</body>
</html>`;
}

function prettyPage(page) {
  const value = String(page || '/').replace(/^\//, '').replace(/[-_]/g, ' ');
  return value ? value.replace(/\b\w/g, c => c.toUpperCase()) : 'Home';
}

function formatUtc(value) {
  if (!value) return '';
  return String(value).replace('T', ' ').replace(/\.\d+Z$/, '').replace(/Z$/, '');
}

function shortReferrer(value) {
  if (!value) return 'Direct / unknown';
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
  } catch (_) {
    return String(value);
  }
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanReferrer(value) {
  const raw = clean(value, 500);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return `${url.protocol}//${url.host}${url.pathname}`.slice(0, 500);
  } catch (_) {
    return '';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function json(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      ...extraHeaders
    }
  });
}
