# Public plugins

Plugins published with the open-source repo. Today that is the reference plugins in [`examples/`](examples/hello_world/README.md), which prove the plugin mechanism end to end: [`hello_world`](examples/hello_world/README.md) for the frontend half, [`hello_backend`](examples/hello_backend/README.md) for the backend half, and `api_too_new`, which exists to be refused by the loader.

Where a plugin lives decides whether it is published. A plugin for one deployment goes in `private/plugins/<name>/`, which the public mirror never publishes; anything here is public.

Both directories are built, type-checked, linted and tested by the front end's tooling in `frontend/` (`pnpm build:plugins`, `pnpm check`, `pnpm lint`, `pnpm test`). Writing one: start from [`examples/hello_world`](examples/hello_world/README.md).
