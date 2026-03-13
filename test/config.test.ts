import { describe, it, expect } from 'vitest';
import { parseConfig, extractServerIdentity, splitNameVersion, extractAllServers } from '../src/config.js';

describe('splitNameVersion', () => {
  it('splits unscoped package with version', () => {
    expect(splitNameVersion('mcp-server@1.2.3')).toEqual({ name: 'mcp-server', version: '1.2.3' });
  });

  it('splits scoped package with version', () => {
    expect(splitNameVersion('@acme/mcp-server@2.0.0')).toEqual({ name: '@acme/mcp-server', version: '2.0.0' });
  });

  it('handles package without version', () => {
    expect(splitNameVersion('mcp-server')).toEqual({ name: 'mcp-server', version: null });
  });

  it('handles scoped package without version', () => {
    expect(splitNameVersion('@acme/mcp-server')).toEqual({ name: '@acme/mcp-server', version: null });
  });
});

describe('extractServerIdentity', () => {
  it('extracts scoped package from npx', () => {
    const id = extractServerIdentity('test', {
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem'],
    });
    expect(id.name).toBe('@modelcontextprotocol/server-filesystem');
    expect(id.transport).toBe('stdio');
  });

  it('extracts package with version from npx', () => {
    const id = extractServerIdentity('test', {
      command: 'npx',
      args: ['mcp-server@1.2.3'],
    });
    expect(id.name).toBe('mcp-server');
    expect(id.version).toBe('1.2.3');
  });

  it('skips -y flag in npx', () => {
    const id = extractServerIdentity('test', {
      command: 'npx',
      args: ['-y', '@acme/mcp-server'],
    });
    expect(id.name).toBe('@acme/mcp-server');
  });

  it('skips --package flag in npx', () => {
    const id = extractServerIdentity('test', {
      command: 'npx',
      args: ['--package', 'some-dep', 'mcp-server'],
    });
    expect(id.name).toBe('mcp-server');
  });

  it('returns null name for node command', () => {
    const id = extractServerIdentity('test', {
      command: 'node',
      args: ['./local-server.js'],
    });
    expect(id.name).toBeNull();
  });

  it('extracts basename for direct binary', () => {
    const id = extractServerIdentity('test', {
      command: '/usr/local/bin/mcp-server-sqlite',
    });
    expect(id.name).toBe('mcp-server-sqlite');
  });

  it('extracts SSE url', () => {
    const id = extractServerIdentity('test', {
      url: 'https://mcp.example.com/sse',
    });
    expect(id.name).toBe('https://mcp.example.com/sse');
    expect(id.transport).toBe('sse');
  });

  it('extracts docker image', () => {
    const id = extractServerIdentity('test', {
      command: 'docker',
      args: ['run', 'mcp/filesystem'],
    });
    expect(id.name).toBe('mcp/filesystem');
  });

  it('handles pnpm dlx', () => {
    const id = extractServerIdentity('test', {
      command: 'pnpm',
      args: ['dlx', 'mcp-server'],
    });
    expect(id.name).toBe('mcp-server');
  });
});

describe('parseConfig', () => {
  it('parses valid MCP config', () => {
    const config = parseConfig(JSON.stringify({
      mcpServers: {
        test: { command: 'npx', args: ['mcp-server'] },
      },
    }));
    expect(Object.keys(config.mcpServers)).toHaveLength(1);
  });

  it('throws on missing mcpServers', () => {
    expect(() => parseConfig('{}')).toThrow('missing "mcpServers"');
  });
});

describe('extractAllServers', () => {
  it('extracts all servers from config', () => {
    const servers = extractAllServers({
      mcpServers: {
        a: { command: 'npx', args: ['server-a'] },
        b: { url: 'https://b.example.com' },
      },
    });
    expect(servers).toHaveLength(2);
    expect(servers[0].key).toBe('a');
    expect(servers[1].key).toBe('b');
  });
});
