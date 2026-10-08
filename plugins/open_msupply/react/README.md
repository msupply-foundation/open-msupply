# open mSupply plugins

> **Imported from [msupply-foundation/open-msupply-plugins](https://github.com/msupply-foundation/open-msupply-plugins)** (Oct 2026, `main` with history — each commit's `Source:` trailer links its original). File issues in this repo now, not there. Built bundles were stripped from history; they live on the bundle server.
>
> This is the plugin for the **React UI**. There is no SolidJS port yet. Build it from `server/` with `cargo run --bin remote_server_cli -- generate-plugin-bundle -i ../plugins/open_msupply/react -o <bundle>.json` (or `generate-and-install-plugin-bundle` to install it as well). Steps further down that name `client/packages/plugins/<name>/` predate the import — the paths here now point into `client/` from where they sit.

A repository for open mSupply plugins
Refer to the [readme](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/plugins/README.md) for details of the plugin framework and development practices.

# Branches

Some plugin examples live in their own branches:

* [Process messages to create a prescription](https://github.com/msupply-foundation/open-msupply-plugins/tree/Process-messages-to-create-prescription), using backend plugins
    * processor -> to process incoming messages
    * use_graphql -> within a plugin to call graphql for creating prescriptions and checking item stock
    * graphql_query -> would call use_graphql to show the difference in async blocking functionality
    * use_repository


