#!/usr/bin/env bash
# Stream agreeonatime logs from a USB-connected iPhone. Run, then open the app.
set -euo pipefail

LOG_DIR="${LOG_DIR:-/tmp/agreeonatime-logs}"
LOG_FILE="$LOG_DIR/live.log"

mkdir -p "$LOG_DIR"
: >"$LOG_FILE"

if ! command -v idevicesyslog >/dev/null 2>&1; then
  echo "Install libimobiledevice: brew install libimobiledevice"
  exit 1
fi

if ! idevice_id -l | grep -q .; then
  echo "No iPhone detected. Plug in the device and trust this Mac."
  exit 1
fi

echo "Logging to $LOG_FILE"
echo "Open agreeonatime on the device now (Ctrl+C to stop)."
exec idevicesyslog 2>&1 | tee "$LOG_FILE" | rg -i \
  'agreeonatime|RCTFatal|Unhandled JS|Invariant|constructor|ViewHolder|Fatal Exception|Terminating app due'
