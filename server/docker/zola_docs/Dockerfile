# Copied from https://github.com/shalzz/zola-deploy-action/blob/master/Dockerfile
from debian:stretch-slim

# Set default locale for the environment
ENV LC_ALL C.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8

RUN apt-get update && apt-get install -y wget git

RUN wget -q -O - \
"https://github.com/getzola/zola/releases/download/v0.13.0/zola-v0.13.0-x86_64-unknown-linux-gnu.tar.gz" \
| tar xzf - -C /usr/local/bin

COPY entrypoint.sh /entrypoint.sh
WORKDIR /home2
WORKDIR /home

ENTRYPOINT ["/entrypoint.sh"]