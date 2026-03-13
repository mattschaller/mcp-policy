import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import type { Policy, PolicyRule, BlockRule } from './types.js';

export function parsePolicy(content: string): Policy {
  const doc = yaml.load(content) as Record<string, unknown>;

  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid policy: expected a YAML object');
  }

  if (doc.version === undefined) {
    throw new Error('Invalid policy: missing "version" field');
  }

  if (doc.version !== 1) {
    throw new Error(`Invalid policy: unsupported version "${doc.version}" (expected 1)`);
  }

  const allowed: PolicyRule[] = Array.isArray(doc.allowed)
    ? doc.allowed.map((entry: unknown) => {
        if (typeof entry === 'string') {
          return { name: entry };
        }
        const obj = entry as Record<string, unknown>;
        const rule: PolicyRule = { name: obj.name as string };
        if (obj.maxVersion) rule.maxVersion = obj.maxVersion as string;
        if (obj.sha256) rule.sha256 = obj.sha256 as string;
        return rule;
      })
    : [];

  const blocked: BlockRule[] = Array.isArray(doc.blocked)
    ? doc.blocked.map((entry: unknown) => {
        if (typeof entry === 'string') {
          return { pattern: entry };
        }
        return { pattern: (entry as Record<string, unknown>).pattern as string };
      })
    : [];

  return {
    version: 1,
    allowed,
    blocked,
    requireVersionPin: Boolean(doc.requireVersionPin),
    requireSHAPin: Boolean(doc.requireSHAPin),
  };
}

export function loadPolicyFromFile(path: string): Policy {
  const content = readFileSync(path, 'utf-8');
  return parsePolicy(content);
}

export async function loadPolicyFromUrl(url: string): Promise<Policy> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch policy from ${url}: ${response.status} ${response.statusText}`);
  }
  const content = await response.text();
  return parsePolicy(content);
}

export async function loadPolicy(options: { path?: string; url?: string }): Promise<Policy> {
  if (options.url) {
    return loadPolicyFromUrl(options.url);
  }
  if (options.path) {
    return loadPolicyFromFile(options.path);
  }
  throw new Error('Either policy path or URL must be provided');
}
