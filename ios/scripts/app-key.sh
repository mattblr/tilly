#!/bin/sh
# Writes the publishable app key from .env into Config/AppKey.xcconfig,
# which Tilly.xcconfig includes. The key never goes into git and is never printed.
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
env_file="$here/../.env"
out="$here/Config/AppKey.xcconfig"

key=$(sed -n 's/^TILLY_APP_KEY=//p' "$env_file")
if [ -z "$key" ]; then
  echo "no TILLY_APP_KEY in $env_file" >&2
  exit 1
fi

# RevenueCat's public SDK key (never a server secret): the Test Store's in dev, the App Store's once that's set up.
revenuecat=$(sed -n 's/^TILLY_REVENUECAT_KEY=//p' "$env_file")

umask 077
printf 'FOIR_APP_KEY = %s\nREVENUECAT_KEY = %s\n' "$key" "$revenuecat" > "$out"
echo "wrote $out"
