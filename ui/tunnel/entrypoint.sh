#!/bin/sh
# Forwards the remote model server's port into the Compose network. Reconnects on failure.
set -eu
: "${TUNNEL_HOST:?set MODEL_HOST_ADDRESS}" "${TUNNEL_USER:?set MODEL_HOST_USER}"
PORT=${TUNNEL_PORT:-18045}
REMOTE_PORT=${TUNNEL_REMOTE_PORT:-$PORT}
while true; do
  # accept-new trusts the host key on first connect, then pins it in the known_hosts volume.
  sshpass -f /run/secrets/model_host_password ssh -N \
    -o PubkeyAuthentication=no -o PreferredAuthentications=password \
    -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/home/tunnel/.ssh/known_hosts \
    -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ConnectTimeout=10 \
    -L "0.0.0.0:${PORT}:127.0.0.1:${REMOTE_PORT}" "${TUNNEL_USER}@${TUNNEL_HOST}" || true
  echo "tunnel to ${TUNNEL_HOST} dropped; retrying in 5s" >&2
  sleep 5
done
