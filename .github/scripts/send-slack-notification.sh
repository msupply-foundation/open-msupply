#!/bin/bash
set -e

~/.venvs/gha/bin/python3 .github/scripts/send-slack-notification.py
