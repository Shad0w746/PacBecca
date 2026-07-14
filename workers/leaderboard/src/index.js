const LEADERBOARD_KEY = "top10";
const MAX_NAME_LENGTH = 14;
const MAX_SCORE = 9999999;
const MAX_LEVEL = 10;
const DEFAULT_ALLOWED_ORIGINS = [
  "https://danwalkerworks.com",
  "https://www.danwalkerworks.com",
  "https://cello-beige-w7jw.squarespace.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173"
];

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/leaderboard") {
      return jsonResponse({ error: "Not found" }, 404, corsHeaders);
    }

    if (!env.LEADERBOARD) {
      return jsonResponse({ error: "Leaderboard storage is not configured" }, 500, corsHeaders);
    }

    if (request.method === "GET") {
      const entries = await readLeaderboard(env);
      return jsonResponse({ entries }, 200, corsHeaders);
    }

    if (request.method === "POST") {
      return handleScoreSubmit(request, env, corsHeaders);
    }

    return jsonResponse({ error: "Method not allowed" }, 405, {
      ...corsHeaders,
      Allow: "GET, POST, OPTIONS"
    });
  }
};

async function handleScoreSubmit(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const submitted = normalizeSubmission(body.entry && typeof body.entry === "object" ? body.entry : body);
  if (!submitted) {
    return jsonResponse({ error: "Invalid score submission" }, 400, corsHeaders);
  }

  const currentEntries = await readLeaderboard(env);
  const nextEntry = {
    ...submitted,
    createdAt: new Date().toISOString()
  };
  const entries = rankEntries([...currentEntries, nextEntry]);
  await env.LEADERBOARD.put(LEADERBOARD_KEY, JSON.stringify(entries));

  return jsonResponse({ entries, entry: nextEntry }, 200, corsHeaders);
}

async function readLeaderboard(env) {
  const raw = await env.LEADERBOARD.get(LEADERBOARD_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? rankEntries(parsed) : [];
  } catch {
    return [];
  }
}

function normalizeSubmission(value) {
  const name = sanitizeName(value.name);
  const score = Number(value.score);
  const level = Number(value.level);

  if (
    !Number.isInteger(score) ||
    score <= 0 ||
    score > MAX_SCORE ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > MAX_LEVEL ||
    typeof value.won !== "boolean"
  ) {
    return null;
  }

  return {
    name,
    score,
    level,
    won: value.won,
    createdAt: new Date().toISOString()
  };
}

function rankEntries(entries) {
  return entries
    .filter(isEntry)
    .sort((a, b) => b.score - a.score || Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(0, 10);
}

function isEntry(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    Number.isInteger(value.score) &&
    Number.isInteger(value.level) &&
    typeof value.won === "boolean" &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

function sanitizeName(value) {
  const cleaned = String(value ?? "")
    .replace(/[^a-zA-Z0-9 _.-]/g, "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .join(" ")
    .slice(0, MAX_NAME_LENGTH);

  return cleaned.length > 0 ? cleaned : "Player";
}

function getCorsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const allowedOrigins = getAllowedOrigins(env);
  const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin"
  };
}

function getAllowedOrigins(env) {
  if (!env.ALLOWED_ORIGINS) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  const origins = env.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

function jsonResponse(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers
  });
}
