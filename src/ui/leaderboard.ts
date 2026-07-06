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

const STORAGE_KEY = "pacbecca.leaderboard.v1";

export function setupLeaderboard(): void {
  const list = document.querySelector<HTMLOListElement>("#leaderboard-list");
  const form = document.querySelector<HTMLFormElement>("#leaderboard-form");
  const input = document.querySelector<HTMLInputElement>("#leaderboard-name");
  const submit = document.querySelector<HTMLButtonElement>("#leaderboard-submit");
  const status = document.querySelector<HTMLParagraphElement>("#leaderboard-status");

  if (!list || !form || !input || !submit || !status) {
    return;
  }

  let pendingScore: FinalScoreDetail | null = null;

  const stopGameKeyHandling = (event: KeyboardEvent): void => {
    event.stopPropagation();
  };

  input.addEventListener("keydown", stopGameKeyHandling);
  input.addEventListener("keyup", stopGameKeyHandling);
  input.addEventListener("keypress", stopGameKeyHandling);

  const render = (): void => {
    const entries = getEntries();
    list.replaceChildren();

    if (entries.length === 0) {
      const item = document.createElement("li");
      item.className = "empty-score";
      item.textContent = "No scores yet";
      list.append(item);
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
      list.append(item);
    });
  };

  window.addEventListener("pacbecca:final-score", (event) => {
    const detail = (event as CustomEvent<FinalScoreDetail>).detail;
    pendingScore = detail;
    input.disabled = false;
    submit.disabled = detail.score <= 0;
    input.value = "";
    input.focus();
    status.textContent = `Final score ${detail.score.toLocaleString()}. Submit for top 10.`;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingScore || pendingScore.score <= 0) {
      return;
    }

    const name = sanitizeName(input.value);
    const nextEntry: LeaderboardEntry = {
      name,
      score: pendingScore.score,
      level: pendingScore.level,
      won: pendingScore.won,
      createdAt: new Date().toISOString()
    };

    const entries = rankLeaderboardEntries([...getEntries(), nextEntry]);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    pendingScore = null;
    input.value = "";
    input.disabled = true;
    submit.disabled = true;
    status.textContent = "Score submitted.";
    render();
  });

  render();
}

function getEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry) => typeof entry.name === "string" && Number.isFinite(entry.score))
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function rankLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries
    .sort((a, b) => b.score - a.score || Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(0, 10);
}

export function sanitizeName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 14);
  return trimmed.length > 0 ? trimmed : "Player";
}
