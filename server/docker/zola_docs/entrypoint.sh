#!/bin/bash

cd docs

git config --global url."https://".insteadOf git://
git config --global url."https://github.com/".insteadOf git@github.com:
git submodule update --init --recursive
zola serve --interface 0.0.0.0 

/bin/bash
# set -e
# set -o pipefail

# cd docs
# zola build --output-dir ../docs_dev
