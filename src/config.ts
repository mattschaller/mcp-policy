import type { McpConfig, McpServerEntry, ServerIdentity } from './types.js';

export function parseConfig(content: string): McpConfig {
  const doc = JSON.parse(content);

  if (doc.mcpServers && typeof doc.mcpServers === 'object') {
    return { mcpServers: doc.mcpServers };
  }

  throw new Error('Invalid MCP config: missing "mcpServers" object');
}

export function splitNameVersion(pkg: string): { name: string; version: string | null } {
  // Handle scoped packages: @scope/name@version
  if (pkg.startsWith('@')) {
    const slashIdx = pkg.indexOf('/');
    if (slashIdx === -1) return { name: pkg, version: null };
    const rest = pkg.slice(slashIdx + 1);
    const atIdx = rest.indexOf('@');
    if (atIdx === -1) return { name: pkg, version: null };
    return {
      name: pkg.slice(0, slashIdx + 1 + atIdx),
      version: rest.slice(atIdx + 1),
    };
  }

  // Unscoped: name@version
  const atIdx = pkg.indexOf('@');
  if (atIdx === -1) return { name: pkg, version: null };
  return {
    name: pkg.slice(0, atIdx),
    version: pkg.slice(atIdx + 1),
  };
}

const NPX_COMMANDS = new Set(['npx', 'bunx', 'pnpm']);
const NPX_SKIP_FLAGS = new Set(['-y', '--yes', '-p', '--package']);

export function extractServerIdentity(key: string, entry: McpServerEntry): ServerIdentity {
  // SSE transport
  if (entry.url) {
    return {
      key,
      name: entry.url,
      version: null,
      raw: entry,
      transport: 'sse',
    };
  }

  const command = entry.command ?? '';
  const args = entry.args ?? [];
  const basename = command.split('/').pop() ?? command;

  // npx / bunx / pnpm dlx
  if (NPX_COMMANDS.has(basename)) {
    const effectiveArgs = basename === 'pnpm' && args[0] === 'dlx' ? args.slice(1) : args;

    let i = 0;
    while (i < effectiveArgs.length) {
      const arg = effectiveArgs[i];
      if (NPX_SKIP_FLAGS.has(arg)) {
        // --package takes a value
        if (arg === '-p' || arg === '--package') {
          i += 2;
        } else {
          i++;
        }
        continue;
      }
      if (arg.startsWith('-')) {
        i++;
        continue;
      }
      // First positional arg is the package name
      const { name, version } = splitNameVersion(arg);
      return { key, name, version, raw: entry, transport: 'stdio' };
    }

    return { key, name: null, version: null, raw: entry, transport: 'stdio' };
  }

  // node command — local script, unresolvable
  if (basename === 'node' || basename === 'node.exe') {
    return { key, name: null, version: null, raw: entry, transport: 'stdio' };
  }

  // docker / podman
  if (basename === 'docker' || basename === 'podman') {
    // Find the image name (arg after "run" that doesn't start with -)
    const runIdx = args.indexOf('run');
    if (runIdx !== -1) {
      for (let i = runIdx + 1; i < args.length; i++) {
        if (!args[i].startsWith('-')) {
          // Skip flag values
          const prev = args[i - 1];
          if (prev && prev.startsWith('-') && !prev.startsWith('--') && prev.length === 2) {
            continue;
          }
          return { key, name: args[i], version: null, raw: entry, transport: 'stdio' };
        }
      }
    }
    return { key, name: null, version: null, raw: entry, transport: 'stdio' };
  }

  // Direct binary
  return { key, name: basename, version: null, raw: entry, transport: 'stdio' };
}

export function extractAllServers(config: McpConfig): ServerIdentity[] {
  return Object.entries(config.mcpServers).map(([key, entry]) =>
    extractServerIdentity(key, entry),
  );
}
