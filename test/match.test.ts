import { describe, it, expect } from 'vitest';
import { matchPattern } from '../src/match.js';

describe('matchPattern', () => {
  it('matches exact strings', () => {
    expect(matchPattern('foo', 'foo')).toBe(true);
  });

  it('rejects non-matching strings', () => {
    expect(matchPattern('foo', 'bar')).toBe(false);
  });

  it('matches wildcard prefix', () => {
    expect(matchPattern('*-server', 'my-server')).toBe(true);
  });

  it('matches wildcard suffix', () => {
    expect(matchPattern('@acme/*', '@acme/mcp-tool')).toBe(true);
  });

  it('matches wildcard in middle', () => {
    expect(matchPattern('mcp-*-server', 'mcp-redis-server')).toBe(true);
  });

  it('does not allow partial matches', () => {
    expect(matchPattern('foo', 'foobar')).toBe(false);
    expect(matchPattern('foo', 'barfoo')).toBe(false);
  });

  it('escapes regex special characters', () => {
    expect(matchPattern('@scope/name', '@scope/name')).toBe(true);
    expect(matchPattern('name.js', 'namexjs')).toBe(false);
  });
});
