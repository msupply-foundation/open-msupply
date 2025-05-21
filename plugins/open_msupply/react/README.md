# open mSupply plugins
A repository for open mSupply plugins
Refer to the [readme](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/plugins/README.md) for details of the plugin framework and development practices.

# Branches

Some plugin examples live in their own branches:

* [Process messages to create a prescription](https://github.com/msupply-foundation/open-msupply-plugins/tree/Process-messages-to-create-prescription), using backend plugins (see this [PR for test steps](https://github.com/msupply-foundation/open-msupply/pull/7832)):
    * processor -> to process incoming messages
    * use_graphql -> within a plugin to call graphql for creating prescriptions and checking item stock
    * graphql_query -> would call use_graphql to show the difference in async blocking functionality


