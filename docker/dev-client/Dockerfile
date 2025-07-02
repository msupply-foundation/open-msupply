
# This Dockerfile is used to build a client with all dependencies
FROM rust:slim

RUN apt-get update && apt-get install -y git make

# Install tools
RUN apt-get install -y curl
# npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs
RUN npm install -g yarn
RUN apt-get install -y pv

# Needs this for yarn to work properly
RUN echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc