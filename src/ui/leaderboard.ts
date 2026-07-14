export interface LeaderboardEntry {
  name: string;
  score: number;
  level: number;
  won: boolean;
  createdAt: string;
}

interface FinalScoreDetail {
  score: number;
  level: number;
  won: boolean;
}

interface LeaderboardApiResponse {
  entries?: unknown;
}

declare global {
  interface Window {
    PACBECCA_LEADERBOARD_API_URL?: string;
  }
}

const STORAGE_KEY = "pacbecca.leaderboard.v1";
const appBaseUrl = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
const LEADERBOARD_FILE_URL = `${appBaseUrl.endsWith("/") ? appBaseUrl : `${appBaseUrl}/`}leaderboard.txt`;
const LOCAL_LEADERBOARD_API_URL = "/api/leaderboard";
const LEADERBOARD_HEADER = "name\tscore\tlevel\twon\tcreatedAt";

export function setupLeaderboard(): void {
  const list = document.querySelector<HTMLOListElement>("#leaderboard-list");
  const form = document.querySelector<HTMLFormElement>("#leaderboard-form");
  const input = document.querySelector<HTMLInputElement>("#leaderboard-name");
  const submit = document.querySelector<HTMLButtonElement>("#leaderboard-submit");
  const restart = document.querySelector<HTMLButtonElement>("#leaderboard-restart");
  const status = document.querySelector<HTMLParagraphElement>("#leaderboard-status");

  if (!list || !form || !input || !submit || !restart || !status) {
    return;
  }

  const leaderboardList = list;
  const leaderboardForm = form;
  const nameInput = input;
  const submitButton = submit;
  const restartButton = restart;
  const statusMessage = status;
  let pendingScore: FinalScoreDetail | null = null;
  let entries: LeaderboardEntry[] = [];

  const stopGameKeyHandling = (event: KeyboardEvent): void => {
    // Let the text field type normally, then keep the key from reaching Phaser.
    event.stopPropagation();
  };

  nameInput.addEventListener("keydown", stopGameKeyHandling);
  nameInput.addEventListener("keyup", stopGameKeyHandling);
  nameInput.addEventListener("keypress", stopGameKeyHandling);

  const render = (): void => {
    leaderboardList.replaceChildren();

    if (entries.length === 0) {
      const item = document.createElement("li");
      item.className = "empty-score";
      item.textContent = "No scores yet";
      leaderboardList.append(item);
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const score = document.createElement("strong");
      const meta = document.createElement("small");

      name.textContent = entry.name;
      score.textContent = entry.score.toLocaleString();
      meta.textContent = entry.won ? "Cleared" : `Level ${entry.level}`;

      item.append(name, score, meta);
      leaderboardList.append(item);
    });
  };

  const load = async (): Promise<void> => {
    entries = await loadLeaderboardEntries();
    render();
  };

  window.addEventListener("pacbecca:final-score", (event) => {
    const detail = (event as CustomEvent<FinalScoreDetail>).detail;
    pendingScore = detail;
    nameInput.disabled = false;
    submitButton.disabled = detail.score <= 0;
    restartButton.disabled = false;
    nameInput.value = "";
    nameInput.focus();
    statusMessage.textContent = `Final score ${detail.score.toLocaleString()}. Submit for top 10 or restart.`;
  });

  window.addEventListener("pacbecca:game-reset", () => {
    clearPendingScore();
  });

  leaderboardForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingScore || pendingScore.score <= 0) {
      return;
    }

    void submitScore();
  });

  async function submitScore(): Promise<void> {
    if (!pendingScore || pendingScore.score <= 0) {
      return;
    }

    const name = sanitizeName(nameInput.value);
    const nextEntry: LeaderboardEntry = {
      name,
      score: pendingScore.score,
      level: pendingScore.level,
      won: pendingScore.won,
      createdAt: new Date().toISOString()
    };

    const nextEntries = rankLeaderboardEntries([...entries, nextEntry]);

    nameInput.disabled = true;
    submitButton.disabled = true;
    restartButton.disabled = true;
    statusMessage.textContent = "Saving score...";

    const result = await saveLeaderboardEntries(nextEntries, nextEntry);
    entries = result.entries;
    pendingScore = null;
    nameInput.value = "";
    statusMessage.textContent = result.savedGlobally
      ? "Score submitted to global leaderboard."
      : result.savedToFile
        ? "Score submitted to leaderboard.txt."
        : "Score saved in this browser. leaderboard.txt is read-only here.";
    render();
  }

  function clearPendingScore(): void {
    pendingScore = null;
    nameInput.value = "";
    nameInput.disabled = true;
    submitButton.disabled = true;
    restartButton.disabled = true;
    statusMessage.textContent = "Finish a run to submit a score.";
  }

  render();
  void load();
}

async function loadLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const globalEntries = await readGlobalLeaderboardEntries();
  if (globalEntries) {
    return globalEntries;
  }

  const [fileEntries, browserEntries] = await Promise.all([readLeaderboardFile(), readBrowserEntries()]);
  return rankLeaderboardEntries([...fileEntries, ...browserEntries]);
}

async function readGlobalLeaderboardEntries(): Promise<LeaderboardEntry[] | null> {
  const apiUrl = getConfiguredLeaderboardApiUrl();
  if (!apiUrl) {
    return null;
  }

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const parsed = (await response.json()) as LeaderboardApiResponse;
    if (!Array.isArray(parsed.entries)) {
      return null;
    }

    return rankLeaderboardEntries(parsed.entries);
  } catch {
    return null;
  }
}

async function readLeaderboardFile(): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch(LEADERBOARD_FILE_URL, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    return parseLeaderboardText(await response.text());
  } catch {
    return [];
  }
}

function readBrowserEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return rankLeaderboardEntries(parsed);
  } catch {
    return [];
  }
}

async function saveLeaderboardEntries(
  nextEntries: LeaderboardEntry[],
  submittedEntry: LeaderboardEntry
): Promise<{ entries: LeaderboardEntry[]; savedToFile: boolean; savedGlobally: boolean }> {
  const entriesToSave = rankLeaderboardEntries(nextEntries);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entriesToSave));

  const globalEntries = await saveGlobalLeaderboardEntry(submittedEntry);
  if (globalEntries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalEntries));
    return { entries: globalEntries, savedToFile: false, savedGlobally: true };
  }

  try {
    const response = await fetch(LOCAL_LEADERBOARD_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: formatLeaderboardText(entriesToSave) })
    });

    if (!response.ok) {
      throw new Error("Leaderboard file save failed");
    }

    return { entries: entriesToSave, savedToFile: true, savedGlobally: false };
  } catch {
    return { entries: entriesToSave, savedToFile: false, savedGlobally: false };
  }
}

async function saveGlobalLeaderboardEntry(entry: LeaderboardEntry): Promise<LeaderboardEntry[] | null> {
  const apiUrl = getConfiguredLeaderboardApiUrl();
  if (!apiUrl) {
    return null;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: entry.name,
        score: entry.score,
        level: entry.level,
        won: entry.won
      })
    });

    if (!response.ok) {
      return null;
    }

    const parsed = (await response.json()) as LeaderboardApiResponse;
    if (!Array.isArray(parsed.entries)) {
      return null;
    }

    return rankLeaderboardEntries(parsed.entries);
  } catch {
    return null;
  }
}

export function rankLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return dedupeLeaderboardEntries(entries.filter(isLeaderboardEntry))
    .sort((a, b) => b.score - a.score || Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(0, 10);
}

export function sanitizeName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 14);
  return trimmed.length > 0 ? trimmed : "Player";
}

export function parseLeaderboardText(text: string): LeaderboardEntry[] {
  const entries = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .filter((line) => line !== LEADERBOARD_HEADER)
    .map(parseLeaderboardLine)
    .filter(isLeaderboardEntry);

  return rankLeaderboardEntries(entries);
}

export function formatLeaderboardText(entries: LeaderboardEntry[]): string {
  const rows = rankLeaderboardEntries(entries).map((entry) =>
    [
      sanitizeName(entry.name),
      String(entry.score),
      String(entry.level),
      entry.won ? "true" : "false",
      entry.createdAt
    ].join("\t")
  );

  return `${LEADERBOARD_HEADER}\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`;
}

function parseLeaderboardLine(line: string): LeaderboardEntry | null {
  const [name, score, level, won, createdAt] = line.split("\t");

  if (!name || !score || !level || !won || !createdAt) {
    return null;
  }

  return {
    name: sanitizeName(name),
    score: Number(score),
    level: Number(level),
    won: won === "true",
    createdAt
  };
}

function isLeaderboardEntry(entry: unknown): entry is LeaderboardEntry {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  const candidate = entry as LeaderboardEntry;
  return (
    typeof candidate.name === "string" &&
    Number.isFinite(candidate.score) &&
    Number.isFinite(candidate.level) &&
    typeof candidate.won === "boolean" &&
    typeof candidate.createdAt === "string" &&
    Number.isFinite(Date.parse(candidate.createdAt))
  );
}

function dedupeLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.name}|${entry.score}|${entry.level}|${entry.won}|${entry.createdAt}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getConfiguredLeaderboardApiUrl(): string | null {
  const runtimeUrl =
    typeof window !== "undefined" ? window.PACBECCA_LEADERBOARD_API_URL : undefined;
  const envUrl = (import.meta as unknown as { env?: { VITE_LEADERBOARD_API_URL?: string } }).env
    ?.VITE_LEADERBOARD_API_URL;

  return normalizeLeaderboardApiUrl(runtimeUrl ?? envUrl);
}

function normalizeLeaderboardApiUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return null;
}
