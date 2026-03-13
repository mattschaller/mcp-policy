import semver from 'semver';
import { matchPattern } from './match.js';
import type { Policy, ServerIdentity, CheckResult, Violation, Warning } from './types.js';

export function checkServersAgainstPolicy(
  servers: ServerIdentity[],
  policy: Policy,
): CheckResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];

  for (const server of servers) {
    // Unresolvable name → warning
    if (server.name === null) {
      warnings.push({
        serverKey: server.key,
        message: `Cannot resolve server name for "${server.key}" — manual review recommended`,
      });
      continue;
    }

    // Blocklist check (takes priority)
    const blocked = policy.blocked.some(rule => matchPattern(rule.pattern, server.name!));
    if (blocked) {
      violations.push({
        serverKey: server.key,
        serverName: server.name,
        type: 'blocked',
        message: `Server "${server.name}" is blocked by policy`,
      });
      continue;
    }

    // Allowlist check
    if (policy.allowed.length > 0) {
      const matchingRule = policy.allowed.find(rule => matchPattern(rule.name, server.name!));

      if (!matchingRule) {
        violations.push({
          serverKey: server.key,
          serverName: server.name,
          type: 'not-allowed',
          message: `Server "${server.name}" is not in the allowlist`,
        });
        continue;
      }

      // maxVersion check
      if (matchingRule.maxVersion && server.version) {
        const coerced = semver.coerce(server.version);
        const maxCoerced = semver.coerce(matchingRule.maxVersion);
        if (coerced && maxCoerced && semver.gt(coerced, maxCoerced)) {
          violations.push({
            serverKey: server.key,
            serverName: server.name,
            type: 'version-exceeds-max',
            message: `Server "${server.name}@${server.version}" exceeds max allowed version "${matchingRule.maxVersion}"`,
          });
        }
      }
    }

    // requireVersionPin check
    if (policy.requireVersionPin && !server.version) {
      violations.push({
        serverKey: server.key,
        serverName: server.name,
        type: 'version-not-pinned',
        message: `Server "${server.name}" does not have a pinned version`,
      });
    }

    // requireSHAPin check
    if (policy.requireSHAPin) {
      violations.push({
        serverKey: server.key,
        serverName: server.name,
        type: 'sha-not-pinned',
        message: `Server "${server.name}" does not have a pinned SHA256 hash`,
      });
    }
  }

  return {
    pass: violations.length === 0,
    servers,
    violations,
    warnings,
  };
}
