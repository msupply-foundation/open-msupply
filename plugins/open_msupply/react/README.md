# open mSupply plugins

> **Imported from [msupply-foundation/open-msupply-plugins](https://github.com/msupply-foundation/open-msupply-plugins)** (Oct 2026, `main` with history — each commit's `Source:` trailer links its original). File issues in this repo now, not there. Built bundles were stripped from history; they live on the bundle server.
>
> This is the plugin for the **React UI**. There is no SolidJS port yet. The build and install steps below still assume the old layout — this repo checked out as a submodule at `client/packages/plugins/<name>/` — and its webpack and tsconfig files still reach up into that directory, so they do not build from here yet.

A repository for open mSupply plugins
Refer to the [readme](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/plugins/README.md) for details of the plugin framework and development practices.

# Branches

Some plugin examples live in their own branches:

* [Process messages to create a prescription](https://github.com/msupply-foundation/open-msupply-plugins/tree/Process-messages-to-create-prescription), using backend plugins
    * processor -> to process incoming messages
    * use_graphql -> within a plugin to call graphql for creating prescriptions and checking item stock
    * graphql_query -> would call use_graphql to show the difference in async blocking functionality
    * use_repository


