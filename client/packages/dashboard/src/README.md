# OMS Dashboard

## Overview

The 'home page' of `omsupply-client`

The OMS dashboard consists of nested widgets, panels, and statistics to provide key information to the user.

## Dashboard Items Structure

```
Dashboard
├── Widget A
│   ├── Panel A
│   │   ├── Statistic A
│   │   └── Statistic B
│   └── Panel B
│       ├── Statistic A
│       └── Statistic B
└── Widget B
    └── Panel A
        └── Statistic A
```

## Dashboard Context

Each dashboard item has a context string that describes its place in the dashboard hierarchy. Contexts are passed to child components, so a panel inherits the context of its parent widget, and each statistic inherits the context of its parent panel. This context uniquely identifies each item within the dashboard structure.

```
Dashboard
├── Widget: distribution
│   ├── Panel: distribution-customer-requisitions
│   │   └── Statistic: distribution-customer-requisitions-new
└── Widget: stock
  └── Panel: stock-summary
    └── Statistic: stock-summary-expiring
```

## Dashboard Plugins

The core dashboard can be extended with plugins to add widgets, panels, or statistics, and hide existing core dashboard items to create the effect of replacement.

### Examples

See [oms plugins](https://github.com/msupply-foundation/open-msupply-plugins) for examples of dashboard plugin implementations.
