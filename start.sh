#!/bin/sh

# Set $HOME_ORCHESTRATOR and $DEFAULT_SYSTEM variables in nginx conf (for /config endpoint)
envsubst '$HOME_ORCHESTRATOR $DEFAULT_SYSTEM' < /etc/nginx/custom-server.conf > /etc/nginx/conf.d/server.conf

# Launch nginx
exec nginx -g 'daemon off;'