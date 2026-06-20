#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const profile = process.argv[2];
if (profile == null || profile.length === 0) {
  console.error('Usage: export-eas-profile-env.mjs <profile>');
  process.exit(1);
}

const root = process.cwd();
const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));
const env = eas?.build?.[profile]?.env;
const buildProfiles = eas?.build;

if (env == null || typeof env !== 'object') {
  console.error(`No env found for EAS build profile: ${profile}`);
  process.exit(1);
}

const profileValuesByKey = new Map();
for (const [profileName, profileConfig] of Object.entries(buildProfiles ?? {})) {
  if (profileName === profile) {
    continue;
  }
  for (const [key, value] of Object.entries(profileConfig?.env ?? {})) {
    const values = profileValuesByKey.get(key) ?? new Set();
    values.add(String(value));
    profileValuesByKey.set(key, values);
  }
}

for (const [key, value] of Object.entries(env)) {
  const existing = process.env[key];
  const existingCameFromAnotherProfile =
    existing != null && (profileValuesByKey.get(key)?.has(existing) ?? false);

  if (existing != null && existing !== '' && !existingCameFromAnotherProfile) {
    continue;
  }

  const escaped = String(value).replace(/'/g, `'\\''`);
  console.log(`export ${key}='${escaped}'`);
}
