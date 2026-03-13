import { describe, it, expect } from 'vitest';
import { checkServersAgainstPolicy } from '../src/check.js';
import type { Policy, ServerIdentity } from '../src/types.js';

function makeServer(overrides: Partial<ServerIdentity> = {}): ServerIdentity {
  return {
    key: 'test',
    name: 'mcp-server',
    version: null,
    raw: { command: 'npx', args: ['mcp-server'] },
    transport: 'stdio',
    ...overrides,
  };
}

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    version: 1,
    allowed: [],
    blocked: [],
    requireVersionPin: false,
    requireSHAPin: false,
    ...overrides,
  };
}

describe('checkServersAgainstPolicy', () => {
  it('passes when server is in allowlist', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'mcp-server' })],
      makePolicy({ allowed: [{ name: 'mcp-server' }] }),
    );
    expect(result.pass).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when server is not in allowlist', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'unknown-server' })],
      makePolicy({ allowed: [{ name: 'mcp-server' }] }),
    );
    expect(result.pass).toBe(false);
    expect(result.violations[0].type).toBe('not-allowed');
  });

  it('fails when server matches blocklist', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'evil-server' })],
      makePolicy({ blocked: [{ pattern: 'evil-*' }] }),
    );
    expect(result.pass).toBe(false);
    expect(result.violations[0].type).toBe('blocked');
  });

  it('blocklist takes priority over allowlist', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'evil-server' })],
      makePolicy({
        allowed: [{ name: 'evil-server' }],
        blocked: [{ pattern: 'evil-*' }],
      }),
    );
    expect(result.pass).toBe(false);
    expect(result.violations[0].type).toBe('blocked');
  });

  it('passes maxVersion check', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'mcp-server', version: '1.0.0' })],
      makePolicy({ allowed: [{ name: 'mcp-server', maxVersion: '2.0.0' }] }),
    );
    expect(result.pass).toBe(true);
  });

  it('fails maxVersion check when version exceeds max', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'mcp-server', version: '3.0.0' })],
      makePolicy({ allowed: [{ name: 'mcp-server', maxVersion: '2.0.0' }] }),
    );
    expect(result.pass).toBe(false);
    expect(result.violations[0].type).toBe('version-exceeds-max');
  });

  it('enforces requireVersionPin', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'mcp-server', version: null })],
      makePolicy({ requireVersionPin: true }),
    );
    expect(result.pass).toBe(false);
    expect(result.violations[0].type).toBe('version-not-pinned');
  });

  it('warns on unresolvable name', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: null })],
      makePolicy({ allowed: [{ name: 'mcp-server' }] }),
    );
    expect(result.pass).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it('passes with empty allowlist (no restriction)', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'any-server' })],
      makePolicy({ allowed: [] }),
    );
    expect(result.pass).toBe(true);
  });

  it('passes with empty blocklist', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'any-server' })],
      makePolicy({ blocked: [] }),
    );
    expect(result.pass).toBe(true);
  });

  it('reports multiple violations', () => {
    const result = checkServersAgainstPolicy(
      [
        makeServer({ key: 'a', name: 'bad-a' }),
        makeServer({ key: 'b', name: 'bad-b' }),
      ],
      makePolicy({ allowed: [{ name: 'good-server' }] }),
    );
    expect(result.violations).toHaveLength(2);
  });

  it('enforces requireSHAPin', () => {
    const result = checkServersAgainstPolicy(
      [makeServer({ name: 'mcp-server' })],
      makePolicy({ requireSHAPin: true }),
    );
    expect(result.pass).toBe(false);
    expect(result.violations[0].type).toBe('sha-not-pinned');
  });
});
