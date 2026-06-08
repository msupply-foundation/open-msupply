+++
title = "host"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

## host

### Overview

Primary/shell package for openmsupply-client

### Intentions

The intention is that this package is the shell for the open msupply client, which brings together all the required modules. Responsibilities:

- Primary shell: App drawers, footer, header.
- Routing.
- Lazily loading packages.
- Setting up app-wide contexts.

### Tips & Things to keep in mind

- To add components into the shell, use the `AppDrawer`/`AppFooter` etc portals.
- To add a keyboard shortcut indication simply add `data-shortcut` e.g. `data-shortcut="Alt+N"`. When the `Control` or the `Alt` key is pressed the text of this property is shown to the user
- To register a keyboard shortcut, you can use `useRegisterActions` to hook into the global CMD+K structure

### Future considerations
