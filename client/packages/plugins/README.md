# Client plugin framework

Plugins are a way of extending front end functionality without altering the base code. Some examples of possible plugin usages:
- Adding a button to a toolbar of a detail view, which is provided with details of the object being viewed (such as `id`) and performs an external action like looking up shipping details from an external API
- Adding a new widget to the dashboard
- Adding a column to a list view for particular objects, and adding editing support for that new field

Plugins are written as [react](https://react.dev/) components and compiled to distributable packages. These are copied to the server and then are available to all clients using that server.

A plugin can interact with the app framework, access language translations, call the data API or use the current theme. 

For example, a plugin can use shared UI components and utility functions from the app framework.
