export const PACBECCA_LOADING_PROGRESS_EVENT = "pacbecca:loading-progress";
export const PACBECCA_LOADING_ERROR_EVENT = "pacbecca:loading-error";
export const PACBECCA_GAME_READY_EVENT = "pacbecca:game-ready";

export interface PacBeccaLoadingProgressDetail {
  progress: number;
  message: string;
}

export interface PacBeccaLoadingErrorDetail {
  message: string;
}

export function dispatchLoadingProgress(progress: number, message: string): void {
  dispatchWindowEvent<PacBeccaLoadingProgressDetail>(PACBECCA_LOADING_PROGRESS_EVENT, {
    progress: clampProgress(progress),
    message
  });
}

export function dispatchLoadingError(message: string): void {
  dispatchWindowEvent<PacBeccaLoadingErrorDetail>(PACBECCA_LOADING_ERROR_EVENT, { message });
}

export function dispatchGameReady(): void {
  dispatchWindowEvent(PACBECCA_GAME_READY_EVENT, {});
}

function dispatchWindowEvent<T>(eventName: string, detail: T): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<T>(eventName, { detail }));
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress));
}
