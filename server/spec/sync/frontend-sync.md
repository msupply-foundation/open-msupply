# Frontend Sync

## Overview

We want to be able to quickly deliver updates to our frontend to our remote servers (without an upgrade e.g. installing a new version of the application via APK or windows installer)

For this to work, we can leverage our sync system to update the frontend code in place after it's downloaded via sync.

## Reference implementations

_Built in reports_
These are built and commited to git, the distributed as part of the binary. They are versioned so that a new install on central server gets distributed out to remote sites that are compatible.

_plugins_
Plugins aren't bundled with the binary, they are synced to remote sites and are loaded if they are compatible.

## Compatibility Versioning requirements

Frontend Plugins need to have 2 compatibility versions.

1. Are they compatible with backend server infrastructure, e.g. Requries backend > 3.0.0
2. Are they compatible with the frontend code e.g. Requires frontend 3.1.3

The frontend code itself needs to be compatible with the backend version.
