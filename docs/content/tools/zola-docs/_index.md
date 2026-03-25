+++
<<<<<<<< Updated upstream:docs/content/docs-guide.md
title = "Docs Guide"
weight = 1
template = "docs/section.html"
========
title = "Zola Docs"
weight = 10
sort_by = "weight"
template = "docs/section.html"
source = "docs"
>>>>>>>> Stashed changes:docs/content/tools/zola-docs/_index.md
+++

# Docs Guide

## Overview

This directory contains developer documentation for Open mSupply, served as a static site using [Zola](https://www.getzola.org/). Content mirrors the repository's README files and can be extended with standalone documentation.

**Site URL**: https://dev-docs.msupply.foundation/

## Directory Layout

```
docs/
├── check-docs-structure.sh      # CI check script
└── content/                     # all site content lives here
<<<<<<<< Updated upstream:docs/content/docs-guide.md
    ├── docs-guide.md            # this file
========
    ├── tools/
    │   ├── _index.md            # source = "docs" (standalone)
    │   └── zola-docs/
    │       └── _index.md        # this file (source = "docs")
>>>>>>>> Stashed changes:docs/content/tools/zola-docs/_index.md
    ├── build/
    │   └── mac/
    │       └── _index.md        # source = "code"
    ├── client/
    │   ├── _index.md            # source = "code"
    │   └── packages/
    │       ├── common/
    │       │   ├── _index.md
    │       │   └── ui/
    │       │       └── ...
    │       └── android/
    │           ├── _index.md
    │           └── images/
    ├── server/
    │   ├── _index.md            # source = "code"
    │   └── service/
    │       ├── _index.md
    │       └── sync/
    │           ├── _index.md
    │           └── images/
    ├── docker/
    │   └── _index.md
    └── standard_reports/
        └── _index.md
```

## Adding Content

Every documentation file includes a `source` field in its frontmatter:

- `source = "code"` — linked to a README in the codebase. The CI check verifies a matching README exists.
- `source = "docs"` — standalone content that lives only on the docs site. No README counterpart expected.

Every page is a directory with an `_index.md` file. To add standalone content:

1. Create a directory under `docs/content/` (e.g. `tools/zola-docs/`)
2. Add an `_index.md` with `source = "docs"` in the frontmatter

Example frontmatter:

```toml
+++
title = "Tools"
weight = 90
sort_by = "weight"
template = "docs/section.html"
source = "docs"
+++
```

### Code-related documentation

Documentation that describes a specific module, package, or area of the codebase should have a README in the repo next to the code it documents. This README is then mirrored to the docs site as an `_index.md`.

2. **A pointer README** at the original code location that links to the docs site. Previously, this README contained the documentation content.
1. **An `_index.md`** in `docs/content/` at the mirrored path and contains the documentation content.

To add a new one:

1. Create a `README.md` in the relevant directory in the repository
2. Create a matching `_index.md` in `docs/content/` at the mirrored path (stripping `src/`, see below)
3. Add Zola frontmatter with `source = "code"` and the title from the first heading
4. Write your documentation content in the `_index.md` file
5. Create a pointer README at the code location
6. If the content references images, store them in an `images/` directory next to the `_index.md`

The CI check script will flag any README that doesn't have a corresponding `_index.md`, and any `_index.md` with `source = "code"` that has no matching README.

Example frontmatter:

```toml
+++
title = "Sync - Synchronisation"
weight = 10
sort_by = "weight"
template = "docs/section.html"
source = "code"
+++
```

Example pointer README (at the original location in the repo):

```markdown
# Sync - Synchronisation

- **Docs site**: https://dev-docs.msupply.foundation/server/service/sync/
- **Source**: [docs/content/server/service/sync/\_index.md](/docs/content/server/service/sync/_index.md)
```

#### `src/` stripped from paths

The `src/` directory segment is a code-only convention and is removed from docs paths. Module names are preserved as-is.

| Repository path                             | Docs path                                            |
| ------------------------------------------- | ---------------------------------------------------- |
| `server/service/src/sync/README.md`         | `docs/content/server/service/sync/_index.md`         |
| `server/repository/src/db_diesel/README.md` | `docs/content/server/repository/db_diesel/_index.md` |
| `client/packages/common/src/ui/README.md`   | `docs/content/client/packages/common/ui/_index.md`   |

### Standalone documentation

Documentation that isn't tied to a specific part of the codebase — such as guides, tutorials, architecture overviews, or tool documentation — lives only in `docs/content/` with no corresponding README in the repo.

1. Create a directory in the appropriate location (e.g. `tools/jenkins/`)
2. Add an `_index.md` with `source = "docs"` in the frontmatter
3. The page will appear as a child of the parent section

### Nesting content

A topic can be documented as a single page or split across multiple pages. Use a single page when the content is short enough to read in one go. Split it when the topic has distinct subtopics that are easier to find and maintain as separate pages.

For example, a reports section could be one long page:

```
content/standard_reports/
└── _index.md            # everything about reports in one page
```

Or split into child pages:

```
content/standard_reports/
├── _index.md              # overview: /standard_reports/
├── setup/
│   └── _index.md          # child: /standard_reports/setup/
├── creating-reports/
│   └── _index.md          # child: /standard_reports/creating-reports/
└── support/
    └── _index.md          # child: /standard_reports/support/
```

Nesting can go as deep as needed:

```
content/standard_reports/
├── _index.md              # /standard_reports/
├── support/
│   └── _index.md          # /standard_reports/support/
└── setup/
    ├── _index.md          # /standard_reports/setup/
    ├── mac/
    │   └── _index.md      # /standard_reports/setup/mac/
    └── windows/
        └── _index.md      # /standard_reports/setup/windows/
```

### Images

Images referenced by a file are stored in an `images/` directory next to the `_index.md` that references them. Image paths in the content use `./images/filename.png`.

## Structure Decisions

### `source` field

Every `_index.md` has a `source` field:

- `source = "code"` — code-related, linked to a README in the codebase
- `source = "docs"` — standalone, no README counterpart

The `source` field makes it clear which docs are code-related and which are standalone. The CI check uses this to decide whether to enforce a matching README.

### Flat content root

Content lives directly under `docs/content/`. Zola generates URLs from the directory structure inside `content/`, so `docs/content/server/service/sync/_index.md` becomes `https://dev-docs.msupply.foundation/server/service/sync/`. This keeps URLs clean and avoids redundancy with the domain name. New top-level sections (e.g. `content/guides/`) can be added within the `content/` directory.

### Pass-through directories

Some directories exist only because a child README is deeper in the tree (e.g. `build/` exists only for `build/mac/`). These are kept to maintain the mirror and accommodate future READMEs at those levels.

## CI Check Script

`docs/check-docs-structure.sh` verifies the docs structure stays in sync with the repository:

- **Missing**: flags any tracked README that has no corresponding `_index.md` in `docs/content/`
- **Orphaned**: flags any `_index.md` without `source = "docs"` that has no corresponding README in the repo

Run it with:

```bash
./docs/check-docs-structure.sh
```

Example failure output:

```
MISSING: some/new/README.md has no corresponding _index.md at docs/content/some/new/_index.md
ORPHANED: docs/content/some/section/_index.md (no corresponding README — add source = "docs" to frontmatter if this is content not relating to a section of code)

Summary: 68 checked, 2 skipped, 2 errors


Check failed.
```

Skipped READMEs:

- `README.md` (root) — not developer module docs
- `.github/workflows/ACTIONS_README.md` — GitHub-specific, not developer docs

## How the Migration Was Done

The initial migration of 67 READMEs was performed by a bash script (see git history for `migrate-readmes.sh`). The script:

- Piped content directly from `git show` to ensure byte-identical copies
- Extracted titles from each README's first heading
- Prepended Zola frontmatter
- Copied co-located images to `images/` directories
- Replaced original READMEs with pointer files
- Verified each written file against the original via diff
