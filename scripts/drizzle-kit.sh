#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export NODE_OPTIONS="${NODE_OPTIONS:---trace-sync-io}"
exec drizzle-kit "$@"
