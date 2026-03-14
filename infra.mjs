#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DEFAULT_SERVICES = ['db', 'redis'];
const ALL_SERVICES = ['db', 'redis', 'api', 'web'];
const COMPOSE_FILE = 'config/docker/docker-compose.yml';

function fail(message) {
  console.error(`[infra] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== 'up' && command !== 'down') {
    fail('usage: node infra.mjs <up|down> [--all] [--build] [--volumes] [service...]');
  }

  const options = {
    command,
    all: false,
    build: false,
    volumes: false,
    services: [],
  };

  for (const arg of rest) {
    if (arg === '--all') {
      options.all = true;
      continue;
    }
    if (arg === '--build') {
      options.build = true;
      continue;
    }
    if (arg === '--volumes' || arg === '-v') {
      options.volumes = true;
      continue;
    }
    if (arg.startsWith('-')) {
      fail(`unknown option: ${arg}`);
    }
    options.services.push(arg);
  }

  if (options.command === 'up' && options.volumes) {
    fail('--volumes is only valid with down');
  }
  if (options.command === 'down' && options.build) {
    fail('--build is only valid with up');
  }
  if (options.volumes && !options.all) {
    fail('--volumes requires --all so Docker can remove the named project volumes safely');
  }

  return options;
}

function resolveServices(options) {
  if (options.all) {
    return [...ALL_SERVICES];
  }
  if (options.services.length > 0) {
    return options.services;
  }
  return [...DEFAULT_SERVICES];
}

function composeBaseArgs() {
  const envFile = existsSync('.env') ? '.env' : '.env.example';
  return ['compose', '--env-file', envFile, '-f', COMPOSE_FILE];
}

function run(args) {
  const result = spawnSync('docker', args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  if (result.error) {
    fail(result.error.message);
  }

  process.exit(1);
}

function runSequence(commands) {
  for (const args of commands) {
    const result = spawnSync('docker', args, {
      stdio: 'inherit',
      env: process.env,
    });

    if (result.error) {
      fail(result.error.message);
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

const options = parseArgs(process.argv.slice(2));
const services = resolveServices(options);
const baseArgs = composeBaseArgs();

if (options.command === 'up') {
  const args = [...baseArgs, 'up', '-d'];
  if (options.build) {
    args.push('--build');
  }
  if (!options.all || options.services.length > 0) {
    args.push(...services);
  }
  run(args);
}

if (options.all) {
  const args = [...baseArgs, 'down'];
  if (options.volumes) {
    args.push('--volumes');
  }
  run(args);
}

runSequence([
  [...baseArgs, 'stop', ...services],
  [...baseArgs, 'rm', '--force', ...services],
]);
