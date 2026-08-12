export const MIGRATION_BLOCKED_EXIT_CODE = 78;
export const STORAGE_UNAVAILABLE_EXIT_CODE = 74;

export interface CandidateStartupFailure {
  readonly reason: 'operational_state_migration_blocked' | 'operational_state_storage_unavailable';
}

export function candidateStartupFailureForExitCode(
  code: number | null,
): CandidateStartupFailure | undefined {
  if (code === MIGRATION_BLOCKED_EXIT_CODE) {
    return { reason: 'operational_state_migration_blocked' };
  }
  if (code === STORAGE_UNAVAILABLE_EXIT_CODE) {
    return { reason: 'operational_state_storage_unavailable' };
  }
  return undefined;
}
