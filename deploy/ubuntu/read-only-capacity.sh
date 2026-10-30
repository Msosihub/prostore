#!/bin/sh
# Run only in the existing server console, as the current non-root user.
# Read-only: no sudo, installs, network probes, environment dumps or process args.
printf 'OS: '
if [ -r /etc/os-release ]; then sed -n 's/^PRETTY_NAME=//p' /etc/os-release; else printf 'unknown\n'; fi
printf 'Architecture: '; uname -m
printf 'CPU logical count: '; getconf _NPROCESSORS_ONLN
awk '/MemTotal:|MemAvailable:|SwapTotal:|SwapFree:/ {print $1, $2, $3}' /proc/meminfo
awk '{print "Load averages (1/5/15m):", $1, $2, $3}' /proc/loadavg
printf 'Root disk (size/used/free KB and percent):\n'
df -Pk / | awk 'NR==2 {print $2, $3, $4, $5}'
printf 'Root inode usage: '; df -Pi / | awk 'NR==2 {print $5}'
printf 'Node: '; if command -v node >/dev/null 2>&1; then node --version; else printf 'not on PATH\n'; fi
printf 'Docker CLI: '; if command -v docker >/dev/null 2>&1; then docker --version; else printf 'not on PATH\n'; fi
if command -v systemctl >/dev/null 2>&1; then
 for unit in nginx caddy docker; do
  printf '%s service: ' "$unit"
  systemctl is-active "$unit" 2>/dev/null || :
 done
fi
printf 'This report does not verify backups, firewall, DNS, TLS renewal, provider access or sustained capacity.\n'
