# FROM nginx:mainline-alpine-slim
FROM nginx

# Replace the default server conf 
RUN rm /etc/nginx/conf.d/default.conf
# Write nginx config to temporary location so that start.sh
# can pipe envsubst to /etc/nginx/conf.d/server.conf
COPY nginx-server.conf /etc/nginx/custom-server.conf

# Copy public files into www directory
COPY public /usr/share/nginx/html

# Set up entrypoint script (puts HOME_ORCHESTRATOR environment
# variable into nginx conf, which needs to happen at run
# time because we're setting env vars with Docker Compose)
COPY start.sh /
RUN set -eux; \
    chmod 500 /start.sh;
CMD ["/start.sh"]