#!/bin/sh
# Regenerates the Swift types for GraphQL/Operations from the schema the app is
# served. Export GraphQL/schema.graphqls with your own app credential first.
#
#   scripts/codegen.sh --offline  generate from the schema already here
#
# Any other arguments go to apollo-ios-cli generate.
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
cd "$here"

if [ "${1:-}" = "--offline" ]; then
  shift
else
  echo "Update GraphQL/schema.graphqls from your app schema, then pass --offline." >&2
  exit 1
fi
"${APOLLO_CLI_PATH:-./apollo-ios-cli}" generate --path apollo-notifications-codegen-config.json "$@"
"${APOLLO_CLI_PATH:-./apollo-ios-cli}" generate --path apollo-safety-codegen-config.json "$@"
"${APOLLO_CLI_PATH:-./apollo-ios-cli}" generate --path apollo-selfies-codegen-config.json "$@"
"${APOLLO_CLI_PATH:-./apollo-ios-cli}" generate --path apollo-execution-codegen-config.json "$@"
"${APOLLO_CLI_PATH:-./apollo-ios-cli}" generate --path apollo-challenges-codegen-config.json "$@"
# Generate the main namespace last: later scoped generators can clean its root file.
"${APOLLO_CLI_PATH:-./apollo-ios-cli}" generate --path apollo-codegen-config.json "$@"
node "$here/../scripts/namespace-notification-files.mjs"
