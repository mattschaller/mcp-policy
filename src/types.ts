export interface PolicyRule {
  name: string;
  maxVersion?: string;
  sha256?: string;
}

export interface BlockRule {
  pattern: string;
}

export interface Policy {
  version: number;
  allowed: PolicyRule[];
  blocked: BlockRule[];
  requireVersionPin: boolean;
  requireSHAPin: boolean;
}

export interface McpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerEntry>;
}

export interface ServerIdentity {
  key: string;
  name: string | null;
  version: string | null;
  raw: McpServerEntry;
  transport: 'stdio' | 'sse';
}

export type ViolationType =
  | 'not-allowed'
  | 'blocked'
  | 'version-exceeds-max'
  | 'version-not-pinned'
  | 'sha-not-pinned'
  | 'unresolvable-name';

export interface Violation {
  serverKey: string;
  serverName: string | null;
  type: ViolationType;
  message: string;
  detail?: string;
}

export interface Warning {
  serverKey: string;
  message: string;
}

export interface CheckResult {
  pass: boolean;
  servers: ServerIdentity[];
  violations: Violation[];
  warnings: Warning[];
}

export interface CLIOptions {
  command: string;
  configPaths: string[];
  policyPath: string;
  policyUrl: string;
  format: 'text' | 'json';
}
