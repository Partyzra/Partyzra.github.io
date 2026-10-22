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
      return renderDashboard(env, url);
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

  // Never store events from the owner's configured public IP address(es).
  // CF-Connecting-IP is supplied by Cloudflare for incoming client requests.
  // Only compare it to a Worker secret; do not put the IP in database rows,
  // GitHub files, logs, or analytics responses. The secret supports a
  // comma/newline-separated IPv4 and/or IPv6 list.
  if (isOwnerIp(request, env)) {
    return withCors(json({ ok: true, excluded: true }, 202), origin);
  }

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

function normalizeIp(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!raw.includes(':')) return raw;
  // URL's IPv6 parser canonicalizes equivalent compressed/expanded forms.
  try { return new URL(`http://[${raw}]/`).hostname.replace(/^\[|\]$/g, ''); }
  catch (_) { return raw; }
}

function isOwnerIp(request, env) {
  const clientIp = normalizeIp(request.headers.get('CF-Connecting-IP'));
  const raw = String(env.EXCLUDED_IPS || '').trim();
  if (!clientIp || !raw) return false;
  return raw.split(/[,;\s]+/).some(candidate => normalizeIp(candidate) === clientIp);
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

// Dashboard v2.6: the event pipeline, IP exclusion and database schema above are unchanged.
// Display-time boundaries are America/Denver; stored timestamps stay UTC.
const DASHBOARD_TZ = 'America/Denver';
// One subject can have multiple alternate files. The current tracker labels these
// as 'Title — Frame 02', so strip only that suffix when grouping subjects.
const PHOTO_SUBJECT_SQL = `COALESCE(NULLIF(TRIM(CASE WHEN instr(label, ' — Frame ') > 0
  THEN substr(label, 1, instr(label, ' — Frame ') - 1) ELSE label END), ''), item, 'Untitled')`;
const RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'all', label: 'All Time' }
];

async function renderDashboard(env, url) {
  try {
    const chosen = RANGE_OPTIONS.some(r => r.id === url.searchParams.get('range'))
      ? url.searchParams.get('range') : '30d';
    const first = await queryRows(env, 'SELECT MIN(created_at) AS first_event FROM events');
    const range = makeDashboardRange(chosen, first[0]?.first_event || null, new Date());
    const filter = range.startUtc
      ? { sql: ' AND created_at >= ? AND created_at < ?', args: [range.startUtc, range.endUtc] }
      : { sql: '', args: [] };

    const comparison = previousRange(range, chosen);
    const [totalsRows, pages, photos, daily, recent, sources, subjects, galleryFunnel, recentPhotos, trends, albumTotals, namedAlbums, recentAlbums] = await Promise.all([
      queryRows(env, `
        SELECT COUNT(*) AS total_events,
          COUNT(DISTINCT session_id) AS sessions,
          SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
          SUM(CASE WHEN event_type = 'photo_view' THEN 1 ELSE 0 END) AS photo_views,
          SUM(CASE WHEN event_type = 'custom_event' THEN 1 ELSE 0 END) AS custom_events,
          COUNT(DISTINCT CASE WHEN event_type = 'photo_view' THEN session_id END) AS photo_sessions,
          COUNT(DISTINCT CASE WHEN event_type = 'photo_view' THEN item END) AS distinct_photos,
          SUM(CASE WHEN event_type = 'photo_view' AND instr(label, ' — Frame ') > 0 THEN 1 ELSE 0 END) AS alternate_opens
        FROM events WHERE 1=1 ${filter.sql}
      `, ...filter.args),
      queryRows(env, `
        SELECT page, COUNT(*) AS views FROM events
        WHERE event_type = 'page_view' ${filter.sql}
        GROUP BY page ORDER BY views DESC, page ASC LIMIT 12
      `, ...filter.args),
      queryRows(env, `
        SELECT item, COALESCE(MAX(label), item) AS label, COUNT(*) AS views,
          COUNT(DISTINCT session_id) AS viewing_sessions
        FROM events WHERE event_type = 'photo_view' AND item IS NOT NULL ${filter.sql}
        GROUP BY item ORDER BY views DESC, item ASC LIMIT 12
      `, ...filter.args),
      queryChart(env, range.bins),
      queryRows(env, `
        SELECT event_type, page, item, label, created_at
        FROM events WHERE 1=1 ${filter.sql}
        ORDER BY created_at DESC, id DESC LIMIT 20
      `, ...filter.args),
      queryRows(env, `
        SELECT referrer, COUNT(*) AS views FROM events
        WHERE event_type = 'page_view' ${filter.sql}
        GROUP BY referrer ORDER BY views DESC
      `, ...filter.args),
      queryRows(env, `
        SELECT ${PHOTO_SUBJECT_SQL} AS subject, COUNT(*) AS views,
          COUNT(DISTINCT session_id) AS viewing_sessions,
          COUNT(DISTINCT item) AS files,
          SUM(CASE WHEN instr(label, ' — Frame ') > 0 THEN 1 ELSE 0 END) AS alternate_opens
        FROM events WHERE event_type = 'photo_view' AND item IS NOT NULL ${filter.sql}
        GROUP BY subject ORDER BY views DESC, subject ASC LIMIT 12
      `, ...filter.args),
      queryRows(env, `
        SELECT COUNT(*) AS sessions_with_events,
          SUM(CASE WHEN saw_gallery = 1 THEN 1 ELSE 0 END) AS gallery_sessions,
          SUM(CASE WHEN saw_gallery = 1 AND saw_photo = 1 THEN 1 ELSE 0 END) AS gallery_photo_sessions
        FROM (
          SELECT session_id,
            MAX(CASE WHEN event_type = 'page_view' AND page = '/photography' THEN 1 ELSE 0 END) AS saw_gallery,
            MAX(CASE WHEN event_type = 'photo_view' THEN 1 ELSE 0 END) AS saw_photo
          FROM events WHERE 1=1 ${filter.sql} GROUP BY session_id
        )
      `, ...filter.args),
      queryRows(env, `
        SELECT item, label, page, created_at FROM events
        WHERE event_type = 'photo_view' AND item IS NOT NULL ${filter.sql}
        ORDER BY created_at DESC, id DESC LIMIT 8
      `, ...filter.args),
      comparison ? queryRows(env, `
        SELECT ${PHOTO_SUBJECT_SQL} AS subject,
          SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) AS current_opens,
          SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) AS previous_opens
        FROM events
        WHERE event_type = 'photo_view' AND item IS NOT NULL
          AND created_at >= ? AND created_at < ?
        GROUP BY subject
        HAVING current_opens > 0
        ORDER BY (current_opens - previous_opens) DESC, current_opens DESC, subject ASC
        LIMIT 8
      `, range.startUtc, range.endUtc, comparison.startUtc, comparison.endUtc,
      comparison.startUtc, range.endUtc) : Promise.resolve([]),
      // Album Analytics V2.6: one custom event per intentional tab change.
      // Uses existing columns and indexes; no D1 schema change is required.
      queryRows(env, `
        SELECT COUNT(*) AS selections,
          SUM(CASE WHEN label <> 'All' THEN 1 ELSE 0 END) AS named_selections,
          COUNT(DISTINCT CASE WHEN label <> 'All' THEN session_id END) AS exploring_sessions,
          COUNT(DISTINCT CASE WHEN label <> 'All' THEN label END) AS named_albums,
          SUM(CASE WHEN label = 'All' THEN 1 ELSE 0 END) AS all_returns
        FROM events
        WHERE event_type = 'custom_event' AND item = 'album_select'
          AND page = '/photography' AND label IS NOT NULL AND label <> '' ${filter.sql}
      `, ...filter.args),
      queryRows(env, `
        SELECT label AS album, COUNT(*) AS selections,
          COUNT(DISTINCT session_id) AS sessions
        FROM events
        WHERE event_type = 'custom_event' AND item = 'album_select'
          AND page = '/photography' AND label IS NOT NULL AND label <> ''
          AND label <> 'All' ${filter.sql}
        GROUP BY label ORDER BY selections DESC, label COLLATE NOCASE ASC LIMIT 15
      `, ...filter.args),
      queryRows(env, `
        SELECT label AS album, created_at FROM events
        WHERE event_type = 'custom_event' AND item = 'album_select'
          AND page = '/photography' AND label IS NOT NULL AND label <> '' ${filter.sql}
        ORDER BY created_at DESC, id DESC LIMIT 10
      `, ...filter.args)
    ]);

    return new Response(dashboardHtml({
      chosen, range, totals: totalsRows[0] || {}, pages, photos, daily, recent,
      subjects, galleryFunnel: galleryFunnel[0] || {}, recentPhotos, trends, comparison,
      albumTotals: albumTotals[0] || {}, namedAlbums, recentAlbums,
      sources: summarizeSources(sources)
    }), {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
      }
    });
  } catch (error) {
    console.error('Dashboard query error', error);
    return new Response('Dashboard unavailable. Check the D1 binding and Worker logs.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' }
    });
  }
}

async function queryRows(env, sql, ...values) {
  const statement = env.DB.prepare(sql);
  const result = values.length ? await statement.bind(...values).run() : await statement.run();
  return result.results || [];
}

// D1's created_at strings are UTC: YYYY-MM-DD HH:MM:SS.
// Compute the UTC instant of Mountain midnight, using Intl rather than a
// constant -06:00 / -07:00 offset (so daylight saving changes work).
function mountainMidnight(dateString) {
  const guess = Date.parse(`${dateString}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DASHBOARD_TZ, timeZoneName: 'shortOffset'
  });
  let epoch = guess;
  for (let i = 0; i < 3; i += 1) {
    const name = formatter.formatToParts(new Date(epoch))
      .find(part => part.type === 'timeZoneName')?.value || 'GMT';
    const match = name.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    const offset = !match ? 0 : (match[1] === '+' ? 1 : -1) *
      (Number(match[2]) * 60 + Number(match[3] || 0));
    const candidate = guess - offset * 60_000;
    if (candidate === epoch) break;
    epoch = candidate;
  }
  return new Date(epoch);
}

function localDateString(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DASHBOARD_TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = name => parts.find(x => x.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dateShift(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthShift(dateString, months) {
  const date = new Date(`${dateString.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function utcSqlTimestamp(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function parseDatabaseTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const date = new Date(`${raw.replace(' ', 'T').replace(/Z$/, '')}Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function makeDashboardRange(id, firstEvent, now) {
  const today = localDateString(now);
  const tomorrow = dateShift(today, 1);
  const firstLocal = localDateString(parseDatabaseTime(firstEvent) || now);
  const bins = [];
  const insertBin = (label, start, end, shortLabel) => bins.push({
    label, shortLabel, startUtc: utcSqlTimestamp(start), endUtc: utcSqlTimestamp(end)
  });
  let startUtc = null;
  const endUtc = utcSqlTimestamp(mountainMidnight(tomorrow));
  let period = '';
  let frequency = 'Daily';

  if (id === 'today') {
    const start = mountainMidnight(today);
    const end = mountainMidnight(tomorrow);
    startUtc = utcSqlTimestamp(start);
    period = prettyDate(today);
    frequency = 'Hourly';
    // This intentionally yields 23 or 25 hours on the DST switch dates.
    for (let t = start.getTime(); t < end.getTime(); t += 3_600_000) {
      const instant = new Date(t);
      const hour = new Intl.DateTimeFormat('en-US', {
        timeZone: DASHBOARD_TZ, hour: 'numeric', hour12: true, timeZoneName: 'short'
      }).format(instant);
      const hourOnly = new Intl.DateTimeFormat('en-US', {
        timeZone: DASHBOARD_TZ, hour: 'numeric', hour12: true
      }).format(instant);
      insertBin(hour, instant, new Date(Math.min(end.getTime(), t + 3_600_000)), hourOnly);
    }
  } else if (id === '7d' || id === '30d') {
    const count = id === '7d' ? 7 : 30;
    const firstDay = dateShift(today, 1 - count);
    startUtc = utcSqlTimestamp(mountainMidnight(firstDay));
    period = `${prettyDate(firstDay, false)} – ${prettyDate(today)}`;
    for (let i = 0; i < count; i += 1) {
      const date = dateShift(firstDay, i);
      const next = dateShift(date, 1);
      insertBin(prettyDate(date), mountainMidnight(date), mountainMidnight(next),
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
          .format(new Date(`${date}T12:00:00Z`)));
    }
  } else {
    // An all-time chart shows all of the history, not just the last 30 days.
    // Group by months initially, quarters for longer histories, years beyond that.
    const firstMonth = `${firstLocal.slice(0, 7)}-01`;
    const months = (Number(today.slice(0, 4)) - Number(firstLocal.slice(0, 4))) * 12 +
      Number(today.slice(5, 7)) - Number(firstLocal.slice(5, 7)) + 1;
    const step = months > 48 ? (months > 144 ? 12 : 3) : 1;
    frequency = step === 12 ? '12-Month' : step === 3 ? '3-Month' : 'Monthly';
    period = `${prettyDate(firstLocal, false)} – ${prettyDate(today)}`;
    for (let month = 0; month < months; month += step) {
      const begin = monthShift(firstMonth, month);
      const end = monthShift(firstMonth, Math.min(month + step, months));
      const label = step === 12 ? `${begin.slice(0, 7)} – ${monthShift(end, -1).slice(0, 7)}` :
        step === 3 ? `${prettyMonth(begin)} – ${prettyMonth(monthShift(end, -1))}` : prettyMonth(begin);
      insertBin(label, mountainMidnight(begin), mountainMidnight(end),
        step === 12 ? begin.slice(0, 4) : prettyMonth(begin));
    }
  }
  return { id, period, startUtc, endUtc, bins, frequency };
}

// Comparison periods use *local calendar days*, not fixed 24-hour UTC shifts,
// so the previous/current intervals both respect Mountain DST transitions.
function previousRange(range, chosen) {
  if (!range.startUtc || chosen === 'all') return null;
  const days = chosen === 'today' ? 1 : chosen === '7d' ? 7 : 30;
  const currentFirstDay = localDateString(parseDatabaseTime(range.startUtc));
  const previousFirstDay = dateShift(currentFirstDay, -days);
  return {
    startUtc: utcSqlTimestamp(mountainMidnight(previousFirstDay)),
    endUtc: range.startUtc,
    label: chosen === 'today' ? 'yesterday' : `previous ${days} days`
  };
}

function prettyDate(iso, includeYear = true) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', ...(includeYear ? { year: 'numeric' } : {}), timeZone: 'UTC'
  }).format(new Date(`${iso}T12:00:00Z`));
}

function prettyMonth(iso) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${iso}T12:00:00Z`));
}

async function queryChart(env, bins) {
  if (!bins.length) return [];

  // Cloudflare D1 allows up to 100 bound parameters per query.
  // Each chart bin uses four, so process groups of 20 (80 parameters)
  // rather than passing 120 parameters for the default 30-day view.
  // This also supports long All Time histories without hitting the limit.
  const MAX_BINS_PER_QUERY = 20;
  const rows = [];

  for (let offset = 0; offset < bins.length; offset += MAX_BINS_PER_QUERY) {
    const chunk = bins.slice(offset, offset + MAX_BINS_PER_QUERY);
    const values = [];
    const tuples = chunk.map((bin, i) => {
      values.push(offset + i, bin.label, bin.startUtc, bin.endUtc);
      return '(?, ?, ?, ?)';
    }).join(', ');

    const results = await queryRows(env, `
      WITH bins(position, label, start_utc, end_utc) AS (VALUES ${tuples})
      SELECT b.position, b.label,
        SUM(CASE WHEN e.event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
        SUM(CASE WHEN e.event_type = 'photo_view' THEN 1 ELSE 0 END) AS photo_views
      FROM bins b LEFT JOIN events e
        ON e.created_at >= b.start_utc AND e.created_at < b.end_utc
      GROUP BY b.position, b.label ORDER BY b.position
    `, ...values);
    rows.push(...results);
  }

  return rows;
}

function summarizeSources(rows) {
  const totals = new Map();
  for (const row of rows) {
    let source = 'Direct / unknown';
    if (row.referrer) {
      try {
        const host = new URL(row.referrer).hostname.toLowerCase().replace(/^www\./, '');
        source = host === 'partyzra.github.io' ? 'Internal navigation' : host;
      } catch (_) { source = 'Other / unknown'; }
    }
    totals.set(source, (totals.get(source) || 0) + Number(row.views || 0));
  }
  return [...totals].sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function dashboardHtml({ chosen, range, totals, pages, photos, daily, recent, sources,
  subjects, galleryFunnel, recentPhotos, trends, comparison, albumTotals, namedAlbums, recentAlbums }) {
  const number = value => Number(value || 0).toLocaleString('en-US');
  const count = key => Number(totals[key] || 0);
  const sessions = count('sessions');
  const sessionDepth = sessions ? (count('page_views') / sessions).toFixed(1) : '0.0';
  const engagement = sessions ? Math.round(count('photo_sessions') / sessions * 100) : 0;
  const gallerySessions = Number(galleryFunnel.gallery_sessions || 0);
  const galleryPhotoSessions = Number(galleryFunnel.gallery_photo_sessions || 0);
  const galleryOpenRate = gallerySessions ? Math.round(galleryPhotoSessions / gallerySessions * 100) : 0;
  const photoSessionOpens = count('photo_sessions')
    ? (count('photo_views') / count('photo_sessions')).toFixed(1) : '0.0';
  const alternateOpens = count('alternate_opens');
  const maxBar = Math.max(0, ...daily.map(d => Number(d.page_views || 0) + Number(d.photo_views || 0)));
  const chartScale = Math.max(1, maxBar);
  const legend = '<span class="key"><i class="key-page"></i>Page views</span><span class="key"><i class="key-photo"></i>Photo opens</span>';
  const nav = RANGE_OPTIONS.map(option => `<a class="filter ${option.id === chosen ? 'is-active' : ''}"
    href="/dashboard?range=${option.id}" ${option.id === chosen ? 'aria-current="page"' : ''}>${option.label}</a>`).join('');

  const dailyBars = daily.map((d, index) => {
    const pages = Number(d.page_views || 0);
    const photos = Number(d.photo_views || 0);
    const pagePercent = (pages / chartScale * 100).toFixed(3);
    const photoPercent = (photos / chartScale * 100).toFixed(3);
    const detail = `${d.label}: ${number(pages)} page views, ${number(photos)} photo opens`;
    const visibleLabel = chosen === '7d' || (chosen === 'today' && index % 4 === 0) ||
      (chosen === '30d' && (index === 0 || index % 5 === 0 || index === daily.length - 1)) ||
      (chosen === 'all' && (daily.length <= 14 || index % Math.ceil(daily.length / 10) === 0));
    const bin = range.bins[index];
    return `<div class="chart-column" title="${escapeHtml(detail)}" aria-label="${escapeHtml(detail)}">
      <div class="chart-stack"><span class="stack-photo" style="height:${photoPercent}%"></span><span class="stack-page" style="height:${pagePercent}%"></span></div>
      <span class="tick">${visibleLabel ? escapeHtml(bin?.shortLabel || '') : '&nbsp;'}</span>
    </div>`;
  }).join('');

  const ranked = (rows, format, empty) => rows.length ? rows.map((r, i) => `
    <div class="rank-row">
      <span class="rank-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="rank-body"><div class="rank-name">${escapeHtml(format(r))}</div>
      <div class="meter"><span style="width:${Math.round(Number(r.views || 0) / Number(rows[0].views || 1) * 100)}%"></span></div></div>
      <span class="rank-value">${number(r.views)}</span>
    </div>`).join('') : `<p class="empty">${empty}</p>`;

  const photoRows = ranked(photos, row => displayPhotoFrame(row.label, row.item), 'No photo opens in this period.');
  const subjectRows = subjects.length ? subjects.map((row, i) => `<div class="rank-row subject-row">
      <span class="rank-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="rank-body"><div class="rank-name">${escapeHtml(row.subject)}</div>
        <span class="rank-meta">${number(row.viewing_sessions)} photo-opening ${Number(row.viewing_sessions) === 1 ? 'session' : 'sessions'} · ${number(row.files)} ${Number(row.files) === 1 ? 'file' : 'files'}</span>
        <div class="meter"><span style="width:${Math.round(Number(row.views || 0) / Number(subjects[0].views || 1) * 100)}%"></span></div></div>
      <span class="rank-value">${number(row.views)}</span></div>`).join('') :
    '<p class="empty">No photographs opened in this period.</p>';
  const trendRows = chosen === 'all'
    ? '<p class="empty">Choose Today, 7 Days, or 30 Days to compare with the preceding equal-length period.</p>'
    : !trends.length ? '<p class="empty">No photography activity in this period yet.</p>'
    : trends.map(row => {
      const current = Number(row.current_opens || 0);
      const previous = Number(row.previous_opens || 0);
      const delta = current - previous;
      const change = previous === 0 ? 'New in period' : delta > 0 ? `+${number(delta)}` : delta < 0 ? `−${number(-delta)}` : 'No change';
      const direction = previous === 0 || delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
      return `<div class="trend-row"><div class="trend-info"><strong>${escapeHtml(row.subject)}</strong>
        <span>${number(current)} now · ${number(previous)} before</span></div>
        <span class="trend-change ${direction}">${escapeHtml(change)}</span></div>`;
    }).join('');
  const photoActivityRows = recentPhotos.length ? recentPhotos.map(row => `<div class="photo-activity-row">
      <div class="photo-activity-info"><strong>${escapeHtml(displayPhotoFrame(row.label, row.item))}</strong>
      <span>${escapeHtml(row.item || '')}</span></div>
      <time>${escapeHtml(formatMountain(row.created_at))}</time></div>`).join('')
    : '<p class="empty">No recent photograph opens in this period.</p>';
  const albumCount = key => Number(albumTotals[key] || 0);
  const albumRows = namedAlbums.length ? namedAlbums.map((row, i) => `<div class="rank-row subject-row">
      <span class="rank-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="rank-body"><div class="rank-name">${escapeHtml(row.album)}</div>
        <span class="rank-meta">${number(row.sessions)} ${Number(row.sessions) === 1 ? 'session' : 'sessions'} selected this album</span>
        <div class="meter"><span style="width:${Math.round(Number(row.selections || 0) / Number(namedAlbums[0].selections || 1) * 100)}%"></span></div></div>
      <span class="rank-value">${number(row.selections)}</span></div>`).join('') :
    '<p class="empty">No named album selections recorded in this period yet.</p>';
  const recentAlbumRows = recentAlbums.length ? recentAlbums.map(row => `<div class="photo-activity-row">
      <div class="photo-activity-info"><strong>${escapeHtml(row.album)}</strong>
        <span>${row.album === 'All' ? 'Returned to full archive' : 'Selected collection'}</span></div>
      <time>${escapeHtml(formatMountain(row.created_at))}</time></div>`).join('') :
    '<p class="empty">No album changes recorded in this period yet.</p>';
  const pageRows = ranked(pages, row => prettyPage(row.page), 'No page views in this period.');
  const sourceRows = sources.length ? sources.map(([name, views]) => `<div class="source-row"><span>${escapeHtml(name)}</span><strong>${number(views)}</strong></div>`).join('') : '<p class="empty">No referrers for this period.</p>';
  const activityRows = recent.length ? recent.map(row => {
    const isAlbum = row.event_type === 'custom_event' && row.item === 'album_select';
    const name = row.event_type === 'page_view' ? 'Page view' : row.event_type === 'photo_view'
      ? 'Photo opened' : isAlbum ? 'Album selected' : 'Interaction';
    const item = row.event_type === 'page_view' ? prettyPage(row.page) :
      isAlbum ? (row.label || 'Album') : stripFrameLabel(row.label || row.item || prettyPage(row.page));
    const file = row.event_type === 'page_view' ? row.page : isAlbum ? 'Photography collection' : row.item;
    return `<tr><td class="date-cell">${escapeHtml(formatMountain(row.created_at))}</td>
      <td><span class="event-tag">${name}</span></td>
      <td><span class="activity-name">${escapeHtml(item)}</span><span class="activity-sub">${escapeHtml(file || '')}</span></td></tr>`;
  }).join('') : '<tr><td colspan="3" class="empty">No activity in this period.</td></tr>';
  const updated = new Intl.DateTimeFormat('en-US', {
    timeZone: DASHBOARD_TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(new Date());

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark"><title>Partyzra / Analytics</title>
<style>
:root{color-scheme:dark;--bg:#080909;--panel:#111313;--panel-2:#141615;--stroke:#292a27;--stroke-soft:#222321;--text:#eeeae3;--muted:#9c9b94;--faint:#6f726c;--gold:#e2bb72;--gold-soft:#b6935a;--paper:#dcd8cd}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}a:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
main{max-width:1260px;margin:auto;padding:42px 28px 80px}
.mast{display:flex;align-items:center;gap:13px;border-bottom:1px solid var(--stroke);padding-bottom:22px;margin-bottom:36px}
.brandmark{height:31px;width:31px;border-radius:50%;border:1px solid #71634e;display:grid;place-items:center;color:var(--gold);font:16px Georgia,serif}
.brandtext{font-size:11px;font-weight:650;letter-spacing:.21em}.edition{margin-left:auto;font-size:10px;color:var(--faint);letter-spacing:.14em;text-transform:uppercase}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;margin-bottom:27px}.eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 9px}.top h1{font:400 clamp(39px,6vw,65px)/.98 Georgia,"Times New Roman",serif;letter-spacing:-.06em;margin:0}.top h1 em{font-style:italic;color:var(--gold)}.top-note{font-size:11px;color:var(--muted);text-align:right;line-height:1.85}.top-note strong{font-weight:500;color:var(--text)}
.controls{display:flex;gap:16px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:18px}.filters{display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:4px;border:1px solid var(--stroke);border-radius:8px;background:var(--panel)}.filter{font-size:11px;padding:8px 13px;border-radius:5px;color:var(--muted);white-space:nowrap;transition:background .15s,color .15s}.filter:hover{color:var(--text)}.filter.is-active{background:#302a20;color:var(--gold);font-weight:600}.period{font-size:11px;color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:11px}.card,.panel{background:var(--panel);border:1px solid var(--stroke);border-radius:10px}.card{padding:21px 21px 19px;min-height:142px;display:flex;flex-direction:column}.cardlabel{font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:var(--muted)}.cardvalue{font:400 clamp(35px,4.2vw,52px)/1.2 Georgia,serif;letter-spacing:-.045em;margin-top:11px;font-variant-numeric:tabular-nums}.cardsub{font-size:11px;color:var(--faint);margin-top:auto;padding-top:9px}
.dashboard-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,1fr);gap:11px}.panel{padding:23px;min-width:0}.panelhead{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:20px}.panel h2{font-size:11px;font-weight:650;color:var(--text);text-transform:uppercase;letter-spacing:.14em;margin:0}.hint{font-size:10px;color:var(--faint)}
.chart-legend{display:flex;gap:15px;font-size:10px;color:var(--muted);flex-wrap:wrap}.key{display:flex;gap:7px;align-items:center}.key i{width:8px;height:8px;border-radius:2px;display:block}.key-page{background:var(--paper)}.key-photo{background:var(--gold)}
.chart-wrap{position:relative;padding-top:11px}.chart-grid{position:absolute;top:11px;left:0;right:0;height:223px;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none}.chart-grid span{border-top:1px dashed var(--stroke-soft);height:1px}
.chart{display:flex;align-items:stretch;gap:clamp(2px,.5vw,7px);height:253px;position:relative}.chart-column{display:flex;min-width:0;flex:1;flex-direction:column;align-items:stretch}.chart-stack{height:223px;display:flex;flex-direction:column-reverse;justify-content:flex-start;position:relative}.chart-stack span{display:block;min-height:0;width:100%}.stack-page{background:var(--paper);opacity:.84}.stack-photo{background:var(--gold)}.tick{height:25px;display:flex;align-items:flex-end;justify-content:center;font-size:9px;color:var(--faint);white-space:nowrap;overflow:visible}.chart-footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--stroke);padding-top:11px;margin-top:3px;font-size:10px;color:var(--faint)}
.rank-row{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:13px;align-items:center;padding:11px 0;border-bottom:1px solid var(--stroke-soft)}.rank-row:last-child{border-bottom:none}.rank-num,.rank-value{font-size:11px;font-variant-numeric:tabular-nums}.rank-num{color:var(--faint)}.rank-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--text)}.rank-value{color:var(--paper)}.meter{background:#232524;height:2px;margin-top:8px}.meter span{display:block;background:var(--gold-soft);height:100%;max-width:100%}
.lower{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:11px}.sources{margin-top:12px}.source-row{display:flex;gap:12px;justify-content:space-between;border-bottom:1px solid var(--stroke-soft);padding:9px 0;font-size:11px}.source-row span{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.source-row strong{font-weight:500;font-variant-numeric:tabular-nums}
.table-wrap{max-height:470px;overflow:auto}table{width:100%;border-collapse:collapse}th{text-align:left;padding:0 8px 11px 0;color:var(--faint);font-size:10px;font-weight:550;letter-spacing:.1em;text-transform:uppercase}td{padding:12px 9px 12px 0;border-top:1px solid var(--stroke-soft);vertical-align:top;font-size:11px}.date-cell{white-space:nowrap;color:var(--muted)}.event-tag{font-size:10px;color:var(--gold);white-space:nowrap}.activity-name{display:block;max-width:230px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.activity-sub{display:block;max-width:230px;font-size:10px;color:var(--faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.photo-intro{display:flex;justify-content:space-between;align-items:baseline;gap:14px;margin:30px 0 12px;border-top:1px solid var(--stroke);padding-top:20px}.photo-intro h2{font:400 31px/1.1 Georgia,serif;letter-spacing:-.045em;margin:0}.photo-intro p{font-size:11px;color:var(--faint);margin:0}.photo-intro em{color:var(--gold);font-style:italic}
.photo-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:11px}.photo-metric{background:var(--panel);border:1px solid var(--stroke);border-radius:10px;padding:17px 19px}.photo-metric small{display:block;font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}.photo-metric strong{display:block;font:400 30px/1.4 Georgia,serif;font-variant-numeric:tabular-nums;margin-top:3px}.photo-metric span{display:block;color:var(--faint);font-size:10px;margin-top:2px}
.rank-meta{display:block;font-size:10px;color:var(--faint);margin-top:3px}.subject-row{padding:13px 0}.photo-detail{margin-top:11px}.trend-row,.photo-activity-row{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:12px 0;border-bottom:1px solid var(--stroke-soft)}.trend-row:last-child,.photo-activity-row:last-child{border-bottom:none}.trend-info,.photo-activity-info{min-width:0}.trend-info strong,.photo-activity-info strong{display:block;font-size:12px;font-weight:500;overflow-wrap:anywhere}.trend-info span,.photo-activity-info span{display:block;font-size:10px;color:var(--faint);margin-top:4px;overflow-wrap:anywhere}.trend-change{font-size:11px;flex-shrink:0;color:var(--muted);font-variant-numeric:tabular-nums}.trend-change.positive{color:var(--gold)}.trend-change.negative{color:var(--faint)}.photo-activity-row time{font-size:10px;color:var(--muted);white-space:nowrap;flex-shrink:0}
.album-intro{margin-top:33px}.album-note{font-size:10px;line-height:1.7;color:var(--faint);margin:13px 1px 4px}.empty{font-size:12px;color:var(--faint);padding:8px 0}.privacy{border-top:1px solid var(--stroke);padding-top:18px;margin-top:26px;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;font-size:10px;line-height:1.8;color:var(--faint)}.privacy p{margin:0}.privacy strong{color:var(--muted);font-weight:500}
@media(max-width:920px){.dashboard-grid,.lower{grid-template-columns:1fr}.cards,.photo-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.panel{padding:20px}}
@media(max-width:560px){main{padding:23px 13px 56px}.mast{margin-bottom:28px}.top{display:block}.top-note{text-align:left;margin-top:17px}.controls{align-items:flex-start}.filters{width:100%;justify-content:space-between}.filter{padding:8px 9px}.cards,.photo-metrics{gap:8px}.photo-intro{display:block}.photo-intro p{margin-top:9px}.photo-metric{padding:15px 13px}.photo-activity-row{align-items:flex-start;flex-direction:column;gap:5px}.card{padding:17px 14px;min-height:126px}.panel{padding:16px}.chart-legend{gap:9px}.chart{gap:2px}.tick{font-size:8px}.date-cell{font-size:10px}.table-wrap{overflow-x:auto}.privacy{display:block}}
</style></head>
<body><main>
  <div class="mast"><div class="brandmark" aria-hidden="true">P</div><div class="brandtext">PARTYZRA</div><span class="edition">Private / Statistics 02.6</span></div>
  <header class="top"><div><p class="eyebrow">Portfolio intelligence</p><h1>Behind the <em>frames.</em></h1></div>
    <div class="top-note">TIMEZONE&nbsp; <strong>Mountain · ${escapeHtml(currentZoneAbbreviation())}</strong><br>
      UPDATED&nbsp; <strong>${escapeHtml(updated)}</strong><br>Refresh to see new activity</div></header>
  <div class="controls"><nav class="filters" aria-label="Date range">${nav}</nav><div class="period">${escapeHtml(range.period)}</div></div>
  <section class="cards" aria-label="Traffic summary">
    <article class="card"><span class="cardlabel">Sessions</span><span class="cardvalue">${number(sessions)}</span><span class="cardsub">Anonymous browsing sessions</span></article>
    <article class="card"><span class="cardlabel">Page views</span><span class="cardvalue">${number(count('page_views'))}</span><span class="cardsub">${sessionDepth} pages per session</span></article>
    <article class="card"><span class="cardlabel">Photograph opens</span><span class="cardvalue">${number(count('photo_views'))}</span><span class="cardsub">${number(count('distinct_photos'))} distinct image files</span></article>
    <article class="card"><span class="cardlabel">Photo engagement</span><span class="cardvalue">${engagement}%</span><span class="cardsub">${number(count('photo_sessions'))} sessions opened a photo</span></article>
  </section>
  <div class="dashboard-grid">
    <section class="panel"><div class="panelhead"><div><h2>Traffic timeline</h2><span class="hint">${escapeHtml(range.frequency)} activity · Mountain Time</span></div><div class="chart-legend">${legend}</div></div>
      <div class="chart-wrap" role="group" aria-label="Timeline of page views and photo opens">
        <div class="chart-grid" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        <div class="chart">${dailyBars}</div>
      </div><div class="chart-footer"><span>${number(count('page_views') + count('photo_views'))} plotted events</span><span>Peak: ${number(maxBar)} per ${range.frequency === 'Hourly' ? 'hour' : range.frequency === 'Daily' ? 'day' : range.frequency === 'Monthly' ? 'month' : 'period'}</span></div>
    </section>
    <section class="panel"><div class="panelhead"><h2>Pages</h2><span class="hint">Page views</span></div>${pageRows}</section>
  </div>
  <div class="photo-intro"><h2>Through the <em>lens.</em></h2><p>Photography insights · Selected date range</p></div>
  <section class="photo-metrics" aria-label="Photography insights">
    <article class="photo-metric"><small>Gallery sessions</small><strong>${number(gallerySessions)}</strong><span>Sessions viewing Photography</span></article>
    <article class="photo-metric"><small>Gallery → photo</small><strong>${galleryOpenRate}%</strong><span>${number(galleryPhotoSessions)} of ${number(gallerySessions)} gallery sessions opened an image</span></article>
    <article class="photo-metric"><small>Alternate frames</small><strong>${number(alternateOpens)}</strong><span>Opens of secondary frames</span></article>
    <article class="photo-metric"><small>Opens / photo session</small><strong>${photoSessionOpens}</strong><span>Average among sessions that opened photographs</span></article>
  </section>
  <div class="lower photo-detail">
    <section class="panel"><div class="panelhead"><h2>Top photographs</h2><span class="hint">All frames grouped by title</span></div>${subjectRows}</section>
    <section class="panel"><div class="panelhead"><h2>Gaining attention</h2><span class="hint">${comparison ? `Versus ${escapeHtml(comparison.label)}` : 'Period comparison'}</span></div>${trendRows}
      <p class="hint" style="margin-top:14px">Changes compare photograph opens in equal-length Mountain Time periods. “New in period” means no opens in the previous period—not a new visitor or a newly uploaded photo.</p></section>
  </div>
  <div class="lower">
    <section class="panel"><div class="panelhead"><h2>Individual image files</h2><span class="hint">Alternate frames counted separately</span></div>${photoRows}</section>
    <section class="panel"><div class="panelhead"><h2>Latest photo opens</h2><span class="hint">Latest 8 in range</span></div>${photoActivityRows}</section>
  </div>
  <div class="photo-intro album-intro"><h2>Inside the <em>collections.</em></h2><p>Album selections · Selected date range</p></div>
  <section class="photo-metrics" aria-label="Album analytics summary">
    <article class="photo-metric"><small>Named album selections</small><strong>${number(albumCount('named_selections'))}</strong><span>Visits made by switching to named tabs</span></article>
    <article class="photo-metric"><small>Exploring sessions</small><strong>${number(albumCount('exploring_sessions'))}</strong><span>Anonymous sessions selecting named albums</span></article>
    <article class="photo-metric"><small>Albums explored</small><strong>${number(albumCount('named_albums'))}</strong><span>Distinct named collections selected</span></article>
    <article class="photo-metric"><small>Returns to All</small><strong>${number(albumCount('all_returns'))}</strong><span>Switches back to the complete archive</span></article>
  </section>
  <div class="lower photo-detail">
    <section class="panel"><div class="panelhead"><h2>Most explored albums</h2><span class="hint">Named tab selections</span></div>${albumRows}</section>
    <section class="panel"><div class="panelhead"><h2>Latest album selections</h2><span class="hint">Latest 10 in range · Mountain Time</span></div>${recentAlbumRows}</section>
  </div>
  <p class="album-note">Album Analytics starts collecting data after this portfolio update is published. The default “All” gallery load is already counted as a photography page view, so only deliberate tab changes count as album selections. This does not measure time spent within an album or associate individual photo opens with an album.</p>
  <div class="lower">
    <section class="panel"><div class="panelhead"><h2>Recent activity</h2><span class="hint">Latest 20 in range</span></div>
      <div class="table-wrap"><table><thead><tr><th>Mountain Time</th><th>Event</th><th>Detail</th></tr></thead><tbody>${activityRows}</tbody></table></div></section>
  </div>
  <div class="lower">
    <section class="panel"><div class="panelhead"><h2>Traffic sources</h2><span class="hint">Referrers from page views</span></div>
      <div class="sources">${sourceRows}</div><p class="hint">Sources depend on referrer information supplied by browsers.</p></section>
    <section class="panel"><div class="panelhead"><h2>Activity details</h2><span class="hint">Selected period</span></div>
      <div class="source-row"><span>All recorded events</span><strong>${number(count('total_events'))}</strong></div>
      <div class="source-row"><span>Custom events (including album tabs)</span><strong>${number(count('custom_events'))}</strong></div>
      <div class="source-row"><span>Session photo-engagement rate</span><strong>${engagement}%</strong></div>
      <p class="hint" style="margin-top:16px">A session is a temporary, anonymous browser session—not a unique person. One person can create several sessions.</p></section>
  </div>
  <footer class="privacy"><p><strong>Private by design.</strong> Counts use existing anonymous session IDs, timestamps, page/photo opens, and referrers.<br>
    No IP addresses, names, email addresses, precise location, or browser fingerprints are intentionally stored.</p>
    <p>DATA STORED IN UTC · DISPLAYED IN AMERICA/DENVER<br>PARTYZRA ANALYTICS · V2.6</p></footer>
</main></body></html>`;
}

function currentZoneAbbreviation() {
  return new Intl.DateTimeFormat('en-US', { timeZone: DASHBOARD_TZ, timeZoneName: 'short' })
    .formatToParts(new Date()).find(x => x.type === 'timeZoneName')?.value || 'MT';
}

function prettyPage(page) {
  const value = String(page || '/').replace(/^\//, '').replace(/[-_]/g, ' ');
  return value ? value.replace(/\b\w/g, c => c.toUpperCase()) : 'Home';
}

function formatMountain(value) {
  const date = parseDatabaseTime(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DASHBOARD_TZ, month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(date);
}

function displayPhotoFrame(label, item) {
  const original = String(label || item || 'Untitled');
  const match = original.match(/\s+[—-]\s*Frame\s*(\d+)$/i);
  if (!match) return original;
  return `${stripFrameLabel(original)} · Frame ${match[1]}`;
}

function stripFrameLabel(label) {
  return String(label || '').replace(/\s+[—-]\s*Frame\s*\d+$/i, '');
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
