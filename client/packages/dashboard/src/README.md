## dashboard

### Overview

The 'home page' of `omsupply-client`

### Intentions

Contain a dashboard page. This involves displaying widgets from multiple different packages - rather than importing various functionality from different packages, packages export a dashboard widget, which this dashboard can import.

### Tips & Things to keep in mind


### Future considerations
- Proper tree shaking would be required to ensure only importing the widget component of packages rather than the whole package.
- Possibly all dashboard widgets should just be plugins.
