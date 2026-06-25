+++
title = "Forms Tutorial 1"
description = "Understanding the Form Architecture"
weight = 2
sort_by = "weight"
template = "docs/section.html"

[extra]
toc = true
top = false
+++

# Open mSupply Form Development Tutorial Series

## Tutorial 1: Understanding the Form Architecture

### Overview

Open mSupply uses a templating system to generate forms and reports from data. Each form consists of several key components that work together to create a complete document.

### Core Components

Every form in Open mSupply consists of these essential files:

1. **`report-manifest.json`** - Configuration file defining the form metadata
2. **Template files** - HTML templates using Tera templating engine
3. **GraphQL query files** - Data retrieval queries
4. **CSS files** - Styling and layout
5. **Optional header/footer files** - Reusable components

### Directory Structure

Forms are organized in a specific directory structure:

```
standard_forms/
├── form-name/
│   ├── latest/                    # Current version
│   │   ├── report-manifest.json   # Form configuration
│   │   └── src/
│   │       ├── template.html      # Main template
│   │       ├── header.html        # Header template (optional)
│   │       ├── footer.html        # Footer template (optional)
│   │       ├── query.graphql      # Data query
│   │       └── style.css          # Styling
│   └── 2.5.0/                     # Previous version
│       └── ...
```

### Form Contexts

Forms are associated with specific contexts that determine what data they can access:

- `INBOUND_SHIPMENT` - For receiving goods
- `OUTBOUND_SHIPMENT` - For dispatching goods
- `STOCKTAKE` - For inventory counting
- `REQUISITION` - For requesting supplies
- `PURCHASE_ORDER` - For ordering from suppliers
- `PRESCRIPTION` - For patient prescriptions
- `REPACK` - For repacking items
- `INTERNAL_ORDER` - For internal transfers

### Key Concepts

**Versioning**: Forms are versioned to maintain backward compatibility. The `latest` folder contains the current version, with numbered folders for previous versions.

**Templating Engine**: Uses Tera templating syntax (similar to Jinja2) for dynamic content generation.

**Data Binding**: GraphQL queries fetch data that gets bound to template variables.

**Responsive Design**: CSS handles both screen and print layouts using media queries.

### Next Steps

In Tutorial 2, we'll create a simple form from scratch, starting with the manifest file and basic template structure.

---
