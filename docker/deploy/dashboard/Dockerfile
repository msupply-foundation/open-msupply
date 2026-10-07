# The dashboard's image, shared by both its containers: node with this
# directory's three files in it. Still no npm dependency and nothing compiled -
# the build is just COPY.
#
# Built rather than bind-mounting the files into the stock image, for the
# reason in ../proxy/Dockerfile: a changed file is a new image, and compose
# recreates a container whose image changed by itself.
#
# Pinned by digest, not just the tag: `snapshot` runs this holding the docker
# socket, which is root on the box, so what it runs must not change under it on
# a rebuild. Move the digest on purpose, when updating node.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402

COPY snapshot.mjs web.mjs /app/
COPY index.html /srv/index.html

# A syntax error fails the build rather than a container that crash-loops.
RUN node --check /app/snapshot.mjs && node --check /app/web.mjs
