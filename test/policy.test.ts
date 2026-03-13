import { describe, it, expect } from 'vitest';
import { parsePolicy } from '../src/policy.js';

describe('parsePolicy', () => {
  it('parses valid YAML with all fields', () => {
    const policy = parsePolicy(`
version: 1
allowed:
  - name: "@modelcontextprotocol/*"
    maxVersion: "2.0.0"
  - mcp-server-sqlite
blocked:
  - pattern: "evil-*"
requireVersionPin: true
requireSHAPin: false
`);

    expect(policy.version).toBe(1);
    expect(policy.allowed).toHaveLength(2);
    expect(policy.allowed[0].name).toBe('@modelcontextprotocol/*');
    expect(policy.allowed[0].maxVersion).toBe('2.0.0');
    expect(policy.allowed[1].name).toBe('mcp-server-sqlite');
    expect(policy.blocked).toHaveLength(1);
    expect(policy.blocked[0].pattern).toBe('evil-*');
    expect(policy.requireVersionPin).toBe(true);
    expect(policy.requireSHAPin).toBe(false);
  });

  it('defaults optional fields', () => {
    const policy = parsePolicy('version: 1');
    expect(policy.allowed).toEqual([]);
    expect(policy.blocked).toEqual([]);
    expect(policy.requireVersionPin).toBe(false);
    expect(policy.requireSHAPin).toBe(false);
  });

  it('throws on missing version', () => {
    expect(() => parsePolicy('allowed: []')).toThrow('missing "version"');
  });

  it('throws on unsupported version', () => {
    expect(() => parsePolicy('version: 2')).toThrow('unsupported version');
  });

  it('throws on invalid YAML', () => {
    expect(() => parsePolicy('{{{')).toThrow();
  });
});
