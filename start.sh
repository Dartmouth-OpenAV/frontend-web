#!/bin/sh

# Set $HOME_ORCHESTRATOR variable in nginx conf (for /config endpoint)
envsubst < /etc/nginx/custom-server.conf > /etc/nginx/conf.d/server.conf

# Launch nginx
exec nginx -g 'daemon off;'