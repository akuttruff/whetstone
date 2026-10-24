#!/bin/sh
# Rebuild and restart the persistent instance (launchd: com.amie.whetstone),
# the one Tailscale serves. `npm run dev` is unaffected.
set -e
cd "$(dirname "$0")/.."
npm run build
launchctl kickstart -k "gui/$(id -u)/com.amie.whetstone"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sfo /dev/null http://127.0.0.1:8310/; then echo "whetstone: deployed"; exit 0; fi
  sleep 1
done
echo "whetstone: restarted, but not answering on :8310 -- see ~/Library/Logs/com.amie.whetstone.log" >&2
exit 1
