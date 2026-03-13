import type { CheckResult } from './types.js';

export function formatText(result: CheckResult, configPath?: string): string {
  const lines: string[] = [];

  if (configPath) {
    lines.push(`Checking ${configPath}...`);
    lines.push('');
  }

  for (const server of result.servers) {
    const hasViolation = result.violations.some(v => v.serverKey === server.key);
    const hasWarning = result.warnings.some(w => w.serverKey === server.key);
    const icon = hasViolation ? 'x' : hasWarning ? '!' : '+';
    const label = server.name ?? `(unresolvable: ${server.key})`;
    const versionSuffix = server.version ? `@${server.version}` : '';
    lines.push(`  [${icon}] ${label}${versionSuffix}`);
  }

  lines.push('');

  for (const v of result.violations) {
    lines.push(`  VIOLATION: ${v.message}`);
  }

  for (const w of result.warnings) {
    lines.push(`  WARNING: ${w.message}`);
  }

  lines.push('');
  lines.push(
    result.pass
      ? `Result: PASS (${result.servers.length} server(s) checked)`
      : `Result: FAIL (${result.violations.length} violation(s), ${result.servers.length} server(s) checked)`,
  );

  return lines.join('\n');
}

export function formatJson(result: CheckResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatGitHubActions(result: CheckResult): string {
  const lines: string[] = [];

  for (const v of result.violations) {
    lines.push(`::error::${v.message}`);
  }

  for (const w of result.warnings) {
    lines.push(`::warning::${w.message}`);
  }

  return lines.join('\n');
}
