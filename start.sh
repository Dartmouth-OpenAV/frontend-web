#!/bin/sh

# Set $DEFAULT_ORCHESTRATOR and $DEFAULT_SYSTEM variables in nginx conf (for /config endpoint)
envsubst '$DEFAULT_ORCHESTRATOR $DEFAULT_SYSTEM' < /etc/nginx/custom-server.conf > /etc/nginx/conf.d/server.conf

# Launch nginx
exec nginx -g 'daemon off;'