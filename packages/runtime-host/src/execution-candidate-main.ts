#!/usr/bin/env node
import { parseInteractiveRuntimeHostCandidateArguments } from './candidate-cli.js';
import { startExecutionRuntimeHostCandidate } from './server/execution-candidate.js';
import { runRuntimeHostProcessLifecycle } from './server/process-lifecycle.js';
import { installRuntimeHostLogCapture } from './process-diagnostics.js';
import {
  MIGRATION_BLOCKED_EXIT_CODE,
  STORAGE_UNAVAILABLE_EXIT_CODE,
} from './candidate-startup-failure.js';

installRuntimeHostLogCapture();

const options = parseInteractiveRuntimeHostCandidateArguments(process.argv.slice(2));
let result: Awaited<ReturnType<typeof startExecutionRuntimeHostCandidate>>;
try {
  result = await startExecutionRuntimeHostCandidate(options);
} catch (error) {
  if (isOperationalStateMigrationBlocked(error)) {
    process.exit(MIGRATION_BLOCKED_EXIT_CODE);
  } else if (isSqliteStorageUnavailable(error)) {
    process.exit(STORAGE_UNAVAILABLE_EXIT_CODE);
  }
  throw error;
}
if (result.kind === 'loser') process.exit(2);

try {
  await runRuntimeHostProcessLifecycle(result.host);
} catch {
  process.exitCode = 1;
}

function isOperationalStateMigrationBlocked(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'operational_state_migration_blocked'
  );
}

function isSqliteStorageUnavailable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const errcode = (error as { errcode?: unknown }).errcode;
  return typeof errcode === 'number' && [7, 8, 10, 13, 14].includes(errcode & 0xff);
}
