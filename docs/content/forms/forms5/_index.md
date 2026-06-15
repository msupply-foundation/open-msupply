+++
title = "Forms Tutorial 5"
description = "Deployment and Versioning"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
toc = true
top = false
+++

## Tutorial 5: Deployment, Versioning, and Production Best Practices

### Objective

Learn how to properly deploy, version, and maintain your forms in a production Open mSupply environment.

### Form Versioning Strategy

#### Understanding Version Numbers

Open mSupply uses semantic versioning for forms:

```
MAJOR.MINOR.PATCH
2.6.1
│ │ │
│ │ └── Patch: Bug fixes, minor template adjustments
│ └──── Minor: New features, additional fields, enhanced functionality
└────── Major: Breaking changes, complete redesigns, different data structure
```

#### Directory Structure for Versioning

```
standard_forms/
└── equipment-request/
    ├── latest/                 # Always points to current version
    │   ├── report-manifest.json
    │   └── src/
    ├── 1.2.1/                 # Previous version
    │   ├── report-manifest.json
    │   └── src/
    ├── 1.1.0/                 # Older version
    │   └── ...
    └── 1.0.0/                 # Original version
        └── ...
```

#### Creating a New Version

1. **Copy the current version**:

```bash
# Copy latest to new version directory
cp -r equipment-request/latest equipment-request/1.3.0

# Update the latest version
# Make your changes in equipment-request/latest/
```

2. **Update the manifest version**:

```json
{
  "is_custom": true,
  "version": "1.3.0", // Update this
  "code": "equipment-request",
  "context": "REQUISITION",
  "name": "Equipment Request",
  "queries": {
    "gql": "query.graphql"
  },
  "header": "header.html"
}
```

3. **Document changes**:
   Create a `CHANGELOG.md` in your form directory:

```markdown
# Equipment Request Form Changelog

## [1.3.0] - 2024-01-15

### Added

- Priority indicators for high-quantity requests
- Supplier contact information section
- Cost estimation calculations

### Changed

- Improved table layout for better print formatting
- Enhanced error handling for missing data

### Fixed

- Date formatting issues in Safari
- Print page break problems

## [1.2.1] - 2023-12-10

### Fixed

- Missing item codes causing template errors
- CSS print media query specificity issues

## [1.2.0] - 2023-11-20

### Added

- Status banners for different requisition states
- Summary calculations section
- Conditional supplier information display

## [1.1.0] - 2023-10-15

### Added

- Signature sections for approval workflow
- Comments section display
- Line numbering in items table

## [1.0.0] - 2023-09-01

### Added

- Initial release of Equipment Request form
- Basic requisition display
- Item table with quantities
- Store header information
```

### Production Deployment Checklist

#### Pre-Deployment Testing

1. **Data Validation Testing**:

```html
<!-- Create a test template for edge cases -->
<div class="test_scenarios">
  <h2>Testing Scenarios</h2>

  <!-- Test empty data -->
  {% if data.requisition.lines.nodes | length == 0 %}
  <p>✓ Empty requisition handling works</p>
  {% endif %}

  <!-- Test null values -->
  {% if not data.requisition.otherParty %}
  <p>✓ Missing supplier handling works</p>
  {% endif %}

  <!-- Test large datasets -->
  {% if data.requisition.lines.nodes | length > 50 %}
  <p>⚠ Large dataset - check performance</p>
  {% endif %}

  <!-- Test special characters -->
  {% for line in data.requisition.lines.nodes %} {% if '"' in line.item.name or '<' in
  line.item.name %}
  <p>⚠ Special characters in item: {{ line.item.name }}</p>
  {% endif %} {% endfor %}
</div>
```

2. **Browser Compatibility Testing**:

```css
/* Add browser-specific CSS for compatibility */
@media print {
  /* Webkit browsers (Chrome, Safari) */
  @-webkit-keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Firefox */
  @-moz-document url-prefix() {
    .signature_section {
      display: block !important;
    }
  }

  /* IE/Edge fallbacks */
  @supports not (display: grid) {
    .summary_grid {
      display: table;
      width: 100%;
    }

    .summary_item {
      display: table-cell;
      width: 33.33%;
    }
  }
}
```

3. **Performance Testing**:

```html
<!-- Add performance monitoring -->
<script>
  // Only in development/testing
  if (window.performance) {
    window.addEventListener('load', function () {
      setTimeout(function () {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log('Form load time:', loadTime + 'ms');

        if (loadTime > 5000) {
          console.warn('Form loading slowly - check query complexity');
        }
      }, 0);
    });
  }
</script>
```

#### Deployment Process

1. **Backup Current Version**:

```bash
# Create backup before deployment
cp -r standard_forms/equipment-request standard_forms/equipment-request.backup.$(date +%Y%m%d)
```

2. **Deploy to Staging**:

```bash
# Copy to staging environment
rsync -av equipment-request/ staging-server:/path/to/forms/equipment-request/
```

3. **Production Deployment**:

```bash
# Deploy to production (with rollback capability)
rsync -av equipment-request/ production-server:/path/to/forms/equipment-request/
```

4. **Verify Deployment**:

```bash
# Check form is accessible
curl -I https://your-opensupply-instance/forms/equipment-request/latest/

# Verify manifest is valid JSON
cat /path/to/forms/equipment-request/latest/report-manifest.json | jq .
```

### Configuration Management

#### Environment-Specific Configurations

Create environment-specific manifest files:

```json
// report-manifest.production.json
{
  "is_custom": true,
  "version": "1.3.0",
  "code": "equipment-request",
  "context": "REQUISITION",
  "name": "Equipment Request",
  "queries": {
    "gql": "query.graphql"
  },
  "arguments": {
    "maxItems": 1000,
    "includeDebug": false
  },
  "header": "header.html"
}

// report-manifest.development.json
{
  "is_custom": true,
  "version": "1.3.0-dev",
  "code": "equipment-request",
  "context": "REQUISITION",
  "name": "Equipment Request (DEV)",
  "queries": {
    "gql": "query.graphql"
  },
  "arguments": {
    "maxItems": 100,
    "includeDebug": true
  },
  "header": "header.html"
}
```

#### Feature Flags in Templates

```html
<!-- Use feature flags for gradual rollouts -->
{% if arguments.includeDebug %}
<div class="debug_info">
  <h3>Debug Information</h3>
  <pre>{{ data | json_encode(pretty=true) }}</pre>
</div>
{% endif %} {% if arguments.enableNewFeatures %}
<div class="new_features">
  <!-- New experimental features -->
</div>
{% endif %}
```

### Monitoring and Maintenance

#### Error Tracking

Add error tracking to your templates:

```html
<!-- Error boundary for production -->
{% try %}
<!-- Main template content -->
{% include "main_content.html" %} {% catch %}
<div class="error_fallback">
  <h2>Form Temporarily Unavailable</h2>
  <p>We're experiencing technical difficulties. Please try again later.</p>
  <p>Error ID: {{ now() | date(format="%Y%m%d_%H%M%S") }}</p>

  {% if arguments.includeDebug %}
  <details>
    <summary>Technical Details</summary>
    <pre>{{ error }}</pre>
  </details>
  {% endif %}
</div>
{% endtry %}
```

#### Performance Monitoring

```html
<!-- Add performance markers -->
<script>
  performance.mark('form-template-start');

  // At end of template
  performance.mark('form-template-end');
  performance.measure('form-template-duration', 'form-template-start', 'form-template-end');

  // Report if slow
  const measures = performance.getEntriesByType('measure');
  measures.forEach((measure) => {
    if (measure.duration > 1000) {
      console.warn(`Slow template rendering: ${measure.duration}ms`);
    }
  });
</script>
```

#### Health Checks

Create a health check template:

```html
<!-- health-check.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Form Health Check</title>
  </head>
  <body>
    <h1>Equipment Request Form Health Check</h1>

    <div class="health_status">
      {% if data.store %}
      <p>✅ Store data: OK</p>
      {% else %}
      <p>❌ Store data: FAILED</p>
      {% endif %} {% if data.requisition %}
      <p>✅ Requisition data: OK</p>
      {% else %}
      <p>❌ Requisition data: FAILED</p>
      {% endif %}

      <p>Timestamp: {{ now() | date(format="%Y-%m-%d %H:%M:%S") }}</p>
      <p>Version: {{ manifest.version }}</p>
    </div>
  </body>
</html>
```

### Security Best Practices

#### Input Sanitization

```html
<!-- Always escape user-generated content -->
<div class="comments">
  <h3>Comments</h3>
  <!-- Good: Automatic escaping -->
  <p>{{ data.requisition.comment }}</p>

  <!-- Avoid: Raw output (only if absolutely necessary and data is trusted) -->
  <!-- {{ data.requisition.comment | safe }} -->
</div>

<!-- Sanitize data in macros -->
{% macro safeDisplay(value, maxLength=100) %} {% if value %} {{ value | truncate(length=maxLength) |
escape }} {% else %} N/A {% endif %} {% endmacro %}
```

#### Access Control

Ensure your queries respect access controls:

```graphql
query SecureRequisitionQuery($storeId: String!, $dataId: String!) {
  # Query automatically respects user permissions
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      # Only returns data user has access to
      id
      status
      requisitionNumber

      # This will be filtered based on user's store access
      otherParty(storeId: $storeId) {
        name
        code
      }
    }
  }
}
```

### Backup and Recovery

#### Automated Backups

```bash
#!/bin/bash
# backup-forms.sh

BACKUP_DIR="/backups/forms/$(date +%Y-%m-%d)"
FORMS_DIR="/path/to/standard_forms"

mkdir -p "$BACKUP_DIR"

# Create timestamped backup
tar -czf "$BACKUP_DIR/forms-backup-$(date +%H%M%S).tar.gz" -C "$FORMS_DIR" .

# Keep only last 30 days of backups
find /backups/forms/ -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

#### Recovery Procedures

```bash
#!/bin/bash
# restore-form.sh

FORM_NAME="$1"
BACKUP_DATE="$2"

if [ -z "$FORM_NAME" ] || [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <form-name> <backup-date>"
  echo "Example: $0 equipment-request 2024-01-15"
  exit 1
fi

BACKUP_FILE="/backups/forms/$BACKUP_DATE/forms-backup-*.tar.gz"
RESTORE_DIR="/path/to/standard_forms"

# Create rollback point
cp -r "$RESTORE_DIR/$FORM_NAME" "$RESTORE_DIR/$FORM_NAME.rollback.$(date +%Y%m%d_%H%M%S)"

# Extract specific form from backup
tar -xzf $BACKUP_FILE -C "/tmp" "$FORM_NAME"
cp -r "/tmp/$FORM_NAME" "$RESTORE_DIR/"

echo "Form $FORM_NAME restored from backup $BACKUP_DATE"
```

### Documentation Standards

#### Form Documentation Template

Create a `README.md` for each form:

```markdown
# Equipment Request Form

## Overview

Custom form for equipment requisitions with enhanced features for priority handling and cost estimation.

## Version History

- **1.3.0** (Current) - Added priority indicators and cost estimation
- **1.2.1** - Bug fixes for date formatting
- **1.2.0** - Added status banners and calculations
- **1.1.0** - Added signatures and comments
- **1.0.0** - Initial release

## Dependencies

- Context: REQUISITION
- Minimum Open mSupply version: 2.5.0
- Required permissions: requisition.read

## Configuration

- `maxItems`: Maximum number of items to display (default: 100)
- `includeStats`: Include stock statistics (default: true)
- `includeDebug`: Show debug information (default: false)

## Data Requirements

### Required Fields

- `requisition.id`
- `requisition.requisitionNumber`
- `requisition.status`

### Optional Fields

- `requisition.comment`
- `requisition.otherParty`
- `itemStats` (if includeStats is true)

## Known Issues

- Print layout may have issues in Firefox < 90
- Large datasets (>1000 items) may cause performance issues
- Special characters in item names require escaping

## Testing

Run the health check template to verify form functionality:
```

GET /forms/equipment-request/health-check

```

## Support
- Documentation: [Internal Wiki Link]
- Issue Tracker: [Ticket System Link]
- Contact: dev-team@yourorganization.com
```

### Troubleshooting Guide

#### Common Issues and Solutions

1. **Template Rendering Errors**:

```html
<!-- Add comprehensive error handling -->
{% if not data %}
<div class="error">No data available - check query and permissions</div>
{% elif data.requisition.__typename == "NodeError" %}
<div class="error">{{ data.requisition.error.description }}</div>
{% elif not data.requisition %}
<div class="error">Requisition not found - check ID parameter</div>
{% else %}
<!-- Normal template content -->
{% endif %}
```

2. **Performance Issues**:

```graphql
# Optimize queries by limiting data
query OptimizedQuery($storeId: String!, $dataId: String!) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      # Only essential fields
      id
      status
      requisitionNumber

      # Limit lines if necessary
      lines(first: 500) {
        nodes {
          requestedQuantity
          item {
            code
            name
          }
        }
      }
    }
  }
}
```

3. **Print Layout Issues**:

```css
/* Comprehensive print CSS */
@media print {
  /* Force page breaks */
  .page_break {
    page-break-before: always;
  }

  /* Avoid breaks inside elements */
  .item_row {
    page-break-inside: avoid;
  }

  /* Hide screen-only elements */
  .no_print {
    display: none !important;
  }

  /* Ensure black text for printing */
  * {
    color: black !important;
    background: white !important;
  }

  /* Show print-only elements */
  .print_only {
    display: block !important;
  }
}
```

### What We've Learned

- Proper versioning strategies and directory structure
- Production deployment checklists and processes
- Environment-specific configurations and feature flags
- Monitoring, error tracking, and performance optimization
- Security best practices and access control
- Backup and recovery procedures
- Documentation standards and troubleshooting guides

### Next Steps

With these five tutorials, you now have a comprehensive understanding of:

1. **Form Architecture** - Understanding the components and structure
2. **Basic Development** - Creating your first form with manifest and templates
3. **Advanced Templating** - Using complex Tera features and data manipulation
4. **GraphQL Mastery** - Writing efficient queries and handling data
5. **Production Deployment** - Managing versions, deployment, and maintenance

You're now ready to create sophisticated, production-ready forms for Open mSupply. Remember to:

- Start simple and iterate
- Test thoroughly across different scenarios
- Document your forms well
- Monitor performance in production
- Keep security and access control in mind
- Maintain proper version control

Happy form development!
