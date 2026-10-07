# The proxy's image: stock Caddy with this directory's Caddyfile in it.
#
# Built rather than bind-mounting the Caddyfile into the stock image. A
# single-file bind mount is bound by inode, so a file replaced on the host
# leaves the container on the old one, and compose cannot see the change at
# all. Baked in, a new Caddyfile is a new image, and `compose up` recreates the
# container because its image changed - nothing to remember, nothing on the
# host to drift.
FROM caddy:alpine

COPY proxy.Caddyfile /etc/caddy/Caddyfile

# A Caddyfile that does not adapt cannot become an image, so it never reaches
# the running proxy - which would otherwise come up broken in front of every
# deployment at once.
#
# The data and config dirs are pointed at a scratch dir and removed: validating
# provisions the internal CA, and left in /data it would be baked into the
# image and copied into the caddy-data volume on a box that has none yet -
# every box sharing one CA, its key in a layer. The real one is minted at
# runtime, in the volume.
RUN mkdir /tmp/validate \
 && DEPLOY_DOMAIN=deploy.invalid XDG_DATA_HOME=/tmp/validate XDG_CONFIG_HOME=/tmp/validate \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
 && rm -r /tmp/validate
