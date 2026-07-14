export function hasCompletedGhostSweep(
  eatenGhostIds: ReadonlySet<string>,
  ghostIds: readonly string[]
): boolean {
  return ghostIds.length > 0 && ghostIds.every((ghostId) => eatenGhostIds.has(ghostId));
}
