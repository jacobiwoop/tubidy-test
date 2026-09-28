const TURSO_URL = process.env.TURSO_DATABASE_URL || "https://spotywoop-db-marcwoop.aws-us-east-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA1NTIwNjksImlkIjoiMDFhMGU1MzctOWYwMS03M2IwLWJlNWMtNTBmMGRjYTYzYTM4Iiwia2lkIjoia1FDN3hxN3BzSlBZSG84Z0lkWEc1c1BYNE9adEZlVFZqTzFNR0VVd0dONCIsInJpZCI6Ijk4NWY4ZDA3LTQ0MmItNGE5OS05YjU3LWVjOWU0ODZiN2E0NCJ9.EakKal1ICD2UlunHJZMVqmCbK8XtW_ZaN8Gdnoul9-wCi4_iPQUAduzOEPgc-XN92K4PK7s_8abZ-ZegWo7gBQ";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const CACHE_TTL_MS = 18 * 60 * 60 * 1000; // 18 hours CDN link TTL

async function executeTurso(sql, args = []) {
  if (!TURSO_URL || !TURSO_TOKEN) return null;
  const pipelineUrl = TURSO_URL.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '') + '/v2/pipeline';

  const formattedArgs = args.map(arg => {
    if (typeof arg === 'number') {
      return { type: 'integer', value: String(arg) };
    }
    return { type: 'text', value: String(arg) };
  });

  const payload = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: formattedArgs
        }
      },
      { type: 'close' }
    ]
  };

  try {
    const resp = await fetch(pipelineUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.results?.[0]?.response?.result;
  } catch (err) {
    console.error('Turso execute error:', err.message);
    return null;
  }
}

async function scrapeTubidy(query) {
  const searchUrl = `https://songs.tubidy.com/search?q=${encodeURIComponent(query)}`;
  const searchHeaders = {
    "User-Agent": USER_AGENT,
    "Referer": "https://www.google.com/"
  };

  const searchRes = await fetch(searchUrl, { headers: searchHeaders });
  if (!searchRes.ok) return null;
  const searchHtml = await searchRes.text();

  // Find first download page url: /download/.../video/...
  const linkRegex = /href="([^"]*\/download\/[^"]+\/video\/([^"/?#]+))"/;
  const match = searchHtml.match(linkRegex);
  if (!match) return null;

  const downloadPageUrl = match[1].startsWith('http') ? match[1] : `https://audio.tubidy.com${match[1]}`;
  const videoId = match[2];

  // Fetch download page
  const pageRes = await fetch(downloadPageUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": "https://audio.tubidy.com/"
    }
  });
  if (!pageRes.ok) return null;
  const pageHtml = await pageRes.text();
  const cookies = pageRes.headers.get('set-cookie') || '';

  // Extract App.video payload
  const payloadMatch = pageHtml.match(/App\.video\(['"]([^'"]+)['"]\)/);
  if (!payloadMatch) return null;
  const videoPayload = payloadMatch[1];

  // Step 1: Request formats
  const formatsRes = await fetch("https://audio.tubidy.com/api/video/formats", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": downloadPageUrl,
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies
    },
    body: new URLSearchParams({ payload: videoPayload }).toString()
  });

  if (!formatsRes.ok) return null;
  const formatsJson = await formatsRes.json();
  const mp3Format = formatsJson.formats?.find(f => f.label?.includes('MP3')) || formatsJson.formats?.[0];
  if (!mp3Format?.payload) return null;

  // Step 2: Request download URL
  const dlRes = await fetch("https://audio.tubidy.com/api/video/download", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": downloadPageUrl,
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies
    },
    body: new URLSearchParams({ payload: mp3Format.payload }).toString()
  });

  if (!dlRes.ok) return null;
  const dlJson = await dlRes.json();
  if (!dlJson.link) return null;

  // Step 3: Resolve direct MP3 redirect URL so Android ExoPlayer does not fail on relative 302 redirects
  let directStreamUrl = dlJson.link;
  try {
    const headRes = await fetch(dlJson.link, {
      method: "HEAD",
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": downloadPageUrl
      },
      redirect: "manual"
    });
    const loc = headRes.headers.get("location");
    if (loc) {
      directStreamUrl = new URL(loc, dlJson.link).href;
    }
  } catch (e) {
    console.warn("Direct URL resolution:", e.message);
  }

  return {
    videoId,
    streamUrl: directStreamUrl,
    size: mp3Format.size || null
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();

  // POST: Allow clients to save/cache a track directly into Turso
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const spotifyId = body.id || body.spotifyId;
      const query = (body.q || body.query || '').toLowerCase().trim();
      const tubidyId = body.tubidyId || '';
      const streamUrl = body.streamUrl || body.url || '';

      if (!streamUrl || (!spotifyId && !query)) {
        return res.status(400).json({ success: false, error: 'streamUrl and either id or query are required' });
      }

      await executeTurso(
        `INSERT INTO track_cache (spotify_id, query, tubidy_id, stream_url, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(spotify_id) DO UPDATE SET
           query = excluded.query,
           tubidy_id = excluded.tubidy_id,
           stream_url = excluded.stream_url,
           updated_at = excluded.updated_at;`,
        [spotifyId || `q_${query.replace(/[^a-z0-9]/g, '_')}`, query, tubidyId, streamUrl, Date.now()]
      );

      return res.status(200).json({ success: true, message: 'Cached successfully', durationMs: Date.now() - startTime });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // GET: Resolve track by query or ID
  const q = req.query.q ? String(req.query.q).trim() : '';
  const id = req.query.id ? String(req.query.id).trim() : '';

  if (!q && !id) {
    return res.status(400).json({ success: false, error: 'Query parameter q or id is required' });
  }

  const normalizedQuery = q.toLowerCase();

  try {
    // 1. Check Turso Cache
    const cached = await executeTurso(
      'SELECT spotify_id, query, tubidy_id, stream_url, updated_at FROM track_cache WHERE spotify_id = ?1 OR query = ?2 LIMIT 1;',
      [id, normalizedQuery]
    );

    if (cached?.rows?.length > 0) {
      const row = cached.rows[0];
      const cachedTime = Number(row[4]?.value || 0);
      const isFresh = (Date.now() - cachedTime) < CACHE_TTL_MS;

      if (isFresh) {
        let streamUrl = row[3]?.value;
        // If cached URL was an intermediate link without final .mp3 path, resolve it
        if (streamUrl && streamUrl.includes('/c.php?')) {
          try {
            const hRes = await fetch(streamUrl, {
              method: "HEAD",
              headers: { "User-Agent": USER_AGENT, "Referer": "https://audio.tubidy.com/" },
              redirect: "manual"
            });
            const loc = hRes.headers.get("location");
            if (loc) {
              streamUrl = new URL(loc, streamUrl).href;
              // update Turso in background
              executeTurso('UPDATE track_cache SET stream_url = ?1 WHERE spotify_id = ?2;', [streamUrl, row[0]?.value]);
            }
          } catch (e) {}
        }

        return res.status(200).json({
          success: true,
          cached: true,
          source: 'turso_cache',
          streamUrl,
          tubidyId: row[2]?.value,
          spotifyId: row[0]?.value,
          headers: {
            "User-Agent": USER_AGENT,
            "Referer": "https://audio.tubidy.com/"
          },
          durationMs: Date.now() - startTime
        });
      }
    }

    // 2. Cache miss -> Live Tubidy scrape
    const searchQuery = q || id;
    const tubidyResult = await scrapeTubidy(searchQuery);

    if (!tubidyResult) {
      return res.status(404).json({
        success: false,
        error: 'Track not found on Tubidy',
        durationMs: Date.now() - startTime
      });
    }

    // 3. Save to Turso cache asynchronously
    const targetId = id || `q_${normalizedQuery.replace(/[^a-z0-9]/g, '_')}`;
    executeTurso(
      `INSERT INTO track_cache (spotify_id, query, tubidy_id, stream_url, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(spotify_id) DO UPDATE SET
         query = excluded.query,
         tubidy_id = excluded.tubidy_id,
         stream_url = excluded.stream_url,
         updated_at = excluded.updated_at;`,
      [targetId, normalizedQuery, tubidyResult.videoId, tubidyResult.streamUrl, Date.now()]
    ).catch(err => console.error('Cache write failed:', err));

    return res.status(200).json({
      success: true,
      cached: false,
      source: 'tubidy_live',
      streamUrl: tubidyResult.streamUrl,
      tubidyId: tubidyResult.videoId,
      spotifyId: targetId,
      size: tubidyResult.size,
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": "https://audio.tubidy.com/"
      },
      durationMs: Date.now() - startTime
    });

  } catch (err) {
    console.error('Resolve error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      durationMs: Date.now() - startTime
    });
  }
}
