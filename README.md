# mcp-policy

Enforce MCP server allowlists and blocklists against developer configs. Catches unauthorized MCP servers before they reach production.

No MCP gateway or enterprise SaaS required — just a `policy.yml` and your existing `.mcp.json` or `claude_desktop_config.json`.

## Install

```bash
npm install -g mcp-policy
```

## Usage

### CLI

```bash
# Check .mcp.json against policy.yml in current directory
mcp-policy check

# Specify files explicitly
mcp-policy check .mcp.json claude_desktop_config.json --policy policy.yml

# Fetch policy from URL
mcp-policy check --policy-url https://example.com/mcp-policy.yml

# JSON output
mcp-policy check --format json
```

### GitHub Action

```yaml
- uses: mattschaller/mcp-policy@v0
  with:
    policy-path: policy.yml
    config-paths: .mcp.json
```

### Programmatic API

```typescript
import { checkPolicy, loadPolicy, parseConfig, extractAllServers, checkServersAgainstPolicy } from 'mcp-policy';

// High-level
const { results, pass } = await checkPolicy({
  policyPath: 'policy.yml',
  configPaths: ['.mcp.json'],
});

// Low-level
const policy = loadPolicy({ path: 'policy.yml' });
const config = parseConfig(fs.readFileSync('.mcp.json', 'utf-8'));
const servers = extractAllServers(config);
const result = checkServersAgainstPolicy(servers, policy);
```

## Policy Schema

```yaml
version: 1

# Servers that are allowed. Empty list = no restriction.
allowed:
  - name: "@modelcontextprotocol/*"
    maxVersion: "2.0.0"
  - name: mcp-server-sqlite

# Servers that are always blocked (takes priority over allowed).
blocked:
  - pattern: "evil-*"

# Require all servers to pin a version (e.g., @1.2.3)
requireVersionPin: false

# Require all servers to pin a SHA256 hash (future)
requireSHAPin: false
```

### Server Name Resolution

mcp-policy extracts the server name from each config entry:

| Command | Extracted Name |
|---------|---------------|
| `npx @scope/server@1.0` | `@scope/server` (version: `1.0`) |
| `npx -y mcp-server` | `mcp-server` |
| `pnpm dlx mcp-server` | `mcp-server` |
| `bunx mcp-server` | `mcp-server` |
| `node ./local.js` | `null` (warning) |
| `docker run img` | `img` |
| `/usr/bin/mcp-sqlite` | `mcp-sqlite` |
| `url: https://...` | URL (SSE transport) |

### Pattern Matching

Both `allowed[].name` and `blocked[].pattern` support `*` wildcards:

- `@modelcontextprotocol/*` — matches any package in the scope
- `mcp-*` — matches any package starting with `mcp-`
- `*-server` — matches any package ending with `-server`

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All servers pass policy |
| 1 | One or more violations |
| 2 | Runtime error (bad config, missing policy) |

## See also

Pair with [eslint-plugin-mcp-security](https://github.com/mattschaller/eslint-plugin-mcp-security) to catch vulnerabilities *inside* MCP server code — 13 ESLint rules mapped to the OWASP MCP Top 10 and real CVEs.

## License

MIT
