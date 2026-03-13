import { readFileSync } from 'node:fs';
import { loadPolicy } from './policy.js';
import { parseConfig, extractAllServers } from './config.js';
import { checkServersAgainstPolicy } from './check.js';
import { formatText, formatJson, formatGitHubActions } from './reporter.js';
import type { CLIOptions, CheckResult } from './types.js';

export { parsePolicy, loadPolicy, loadPolicyFromFile, loadPolicyFromUrl } from './policy.js';
export { parseConfig, extractAllServers, extractServerIdentity, splitNameVersion } from './config.js';
export { checkServersAgainstPolicy } from './check.js';
export { matchPattern } from './match.js';
export { formatText, formatJson, formatGitHubActions } from './reporter.js';
export type {
  Policy,
  PolicyRule,
  BlockRule,
  McpConfig,
  McpServerEntry,
  ServerIdentity,
  Violation,
  Warning,
  CheckResult,
  ViolationType,
  CLIOptions,
} from './types.js';

const VERSION = '0.1.0';

function printHelp(): void {
  console.log(`mcp-policy v${VERSION} — Enforce MCP server allowlists and blocklists.

Usage: mcp-policy check [config-path...]

Options:
  --policy <path>        Path to policy.yml (default: policy.yml)
  --policy-url <url>     URL to fetch policy from
  --format text|json     Output format (default: text)
  -V, --version          Output version
  -h, --help             Display help

Arguments:
  config-path            MCP config files to check (default: .mcp.json)`);
}

function parseArgs(argv: string[]): CLIOptions {
  const options: CLIOptions = {
    command: '',
    configPaths: [],
    policyPath: 'policy.yml',
    policyUrl: '',
    format: 'text',
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '-V':
      case '--version':
        console.log(VERSION);
        process.exit(0);
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
      case '--policy':
        i++;
        if (!argv[i]) {
          console.error('Error: --policy requires a path');
          process.exit(2);
        }
        options.policyPath = argv[i];
        break;
      case '--policy-url':
        i++;
        if (!argv[i]) {
          console.error('Error: --policy-url requires a URL');
          process.exit(2);
        }
        options.policyUrl = argv[i];
        break;
      case '--format':
        i++;
        if (argv[i] !== 'text' && argv[i] !== 'json') {
          console.error('Error: --format must be "text" or "json"');
          process.exit(2);
        }
        options.format = argv[i] as 'text' | 'json';
        break;
      case 'check':
        options.command = 'check';
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(2);
        }
        options.configPaths.push(arg);
        break;
    }
    i++;
  }

  if (options.configPaths.length === 0) {
    options.configPaths = ['.mcp.json'];
  }

  return options;
}

function getGitHubActionInputs(): Partial<CLIOptions> | null {
  const githubActions = process.env.GITHUB_ACTIONS === 'true';
  if (!githubActions) return null;

  const inputs: Partial<CLIOptions> = {};

  const policyPath = process.env.INPUT_POLICY_PATH;
  if (policyPath) {
    inputs.policyPath = policyPath;
  }

  const policyUrl = process.env.INPUT_POLICY_URL;
  if (policyUrl) {
    inputs.policyUrl = policyUrl;
  }

  const configPaths = process.env.INPUT_CONFIG_PATHS;
  if (configPaths) {
    inputs.configPaths = configPaths.split(/\s+/).filter(Boolean);
  }

  return inputs;
}

export async function checkPolicy(options: {
  policyPath?: string;
  policyUrl?: string;
  configPaths: string[];
}): Promise<{ results: { configPath: string; result: CheckResult }[]; pass: boolean }> {
  const policy = await loadPolicy({
    path: options.policyPath,
    url: options.policyUrl,
  });

  const results: { configPath: string; result: CheckResult }[] = [];
  let allPass = true;

  for (const configPath of options.configPaths) {
    const content = readFileSync(configPath, 'utf-8');
    const config = parseConfig(content);
    const servers = extractAllServers(config);
    const result = checkServersAgainstPolicy(servers, policy);
    results.push({ configPath, result });
    if (!result.pass) allPass = false;
  }

  return { results, pass: allPass };
}

async function main(): Promise<void> {
  const cliOptions = parseArgs(process.argv.slice(2));

  // Merge GitHub Action inputs
  const actionInputs = getGitHubActionInputs();
  if (actionInputs) {
    if (actionInputs.policyPath && cliOptions.policyPath === 'policy.yml') {
      cliOptions.policyPath = actionInputs.policyPath;
    }
    if (actionInputs.policyUrl) {
      cliOptions.policyUrl = actionInputs.policyUrl;
    }
    if (actionInputs.configPaths && cliOptions.configPaths.length === 1 && cliOptions.configPaths[0] === '.mcp.json') {
      cliOptions.configPaths = actionInputs.configPaths;
    }
  }

  if (!cliOptions.command) {
    cliOptions.command = 'check';
  }

  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

  const { results, pass } = await checkPolicy({
    policyPath: cliOptions.policyUrl ? undefined : cliOptions.policyPath,
    policyUrl: cliOptions.policyUrl || undefined,
    configPaths: cliOptions.configPaths,
  });

  for (const { configPath, result } of results) {
    if (cliOptions.format === 'json') {
      console.log(formatJson(result));
    } else {
      console.log(formatText(result, configPath));
    }

    if (isGitHubActions && !result.pass) {
      console.log(formatGitHubActions(result));
    }
  }

  process.exit(pass ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(2);
});
