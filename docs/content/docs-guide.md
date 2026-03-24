+++
title = "Docs Guide"
weight = 1
template = "docs/section.html"
+++

# Docs Guide

## Overview

This directory contains developer documentation for Open mSupply, served as a static site using [Zola](https://www.getzola.org/). Content mirrors the repository's README files and can be extended with additional authored content.

**Site URL**: https://dev-docs.msupply.foundation/

## Directory Layout

```
docs/
├── check-docs-structure.sh      # CI check script
└── content/                     # all site content lives here
    ├── docs-guide.md            # this file
    ├── build/
    │   └── mac/
    │       └── _index.md
    ├── client/
    │   ├── _index.md
    │   └── packages/
    │       ├── common/
    │       │   ├── _index.md
    │       │   └── ui/
    │       │       └── ...
    │       └── android/
    │           ├── _index.md
    │           └── images/
    ├── server/
    │   ├── _index.md
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

### Code-related documentation

Documentation that describes a specific module, package, or area of the codebase should have a README in the repo next to the code it documents. This README is then mirrored to the docs site as an `_index.md`.

These files:

- Contain Zola TOML frontmatter (`+++` block) followed by the original README content
- Act as **section pages** in Zola, meaning they can have child pages beneath them
- Are paired with a **pointer README** in the original location that links back to the docs site

To add a new one:

1. Create a `README.md` in the relevant directory in the repository
2. Create a matching `_index.md` in `docs/content/` at the mirrored path (stripping `src/`, see below)
3. Add Zola frontmatter with the title extracted from the README's first heading
4. Replace the original README with a pointer file
5. If the README references images, copy them to an `images/` directory next to the `_index.md`

The CI check script will flag any README that doesn't have a corresponding `_index.md` or vice versa.

Example frontmatter:

```toml
+++
title = "Sync - Synchronisation"
weight = 10
sort_by = "weight"
template = "docs/section.html"
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

### Non-code documentation

Documentation that isn't tied to a specific part of the codebase — such as guides, tutorials, architecture overviews, or content sourced from wikis or external docs — lives only in `docs/content/` with no corresponding README in the repo.

1. Create a named `.md` file (e.g. `setup-guide.md`) in the appropriate section directory
2. Add Zola frontmatter with a title and weight
3. The file will appear as a child page of that section

These files are not tracked by the CI check script since they have no README counterpart.

Example:

```
content/standard_reports/
├── _index.md              # mirrored README (section page)
├── setup.md               # authored leaf page
├── creating-reports.md    # authored leaf page
└── support.md             # authored leaf page
```

URLs:

- `/standard_reports/` — the section page (mirrored README)
- `/standard_reports/setup/` — leaf page
- `/standard_reports/creating-reports/` — leaf page
- `/standard_reports/support/` — leaf page

### Nesting content

A topic can be documented as a single page or split across multiple pages. Use a single page when the content is short enough to read in one go. Split it when the topic has distinct subtopics that are easier to find and maintain as separate pages.

For example, a reports section could be one long page:

```
content/standard_reports/
└── _index.md            # everything about reports in one page
```

Or split into focused pages:

```
content/standard_reports/
├── _index.md              # overview (section page)
├── setup.md               # child: /standard_reports/setup/
├── creating-reports.md    # child: /standard_reports/creating-reports/
└── support.md             # child: /standard_reports/support/
```

In Zola, an `_index.md` file is a **section** — it represents a directory and any `.md` files next to it become its **children** (pages listed under it). A named file like `setup.md` is a **leaf** — a standalone page that cannot have its own children.

This means if a subtopic itself needs further breakdown, it must become a directory with its own `_index.md`:

```
content/standard_reports/
├── _index.md              # section page: /standard_reports/
├── support.md             # leaf: /standard_reports/support/
└── setup/                 # subsection — because setup has its own children
    ├── _index.md          # section page: /standard_reports/setup/
    ├── mac.md             # child: /standard_reports/setup/mac/
    └── windows.md         # child: /standard_reports/setup/windows/
```

A named file cannot do this — `setup.md` cannot have `mac.md` and `windows.md` beneath it. If you find a leaf page needs children later, convert it from a named file to a directory with `_index.md`.

### Named file and directory collision

A named file and a directory cannot share the same name at the same level:

```
# This does NOT work — URL collision at /server/sync/
content/server/
├── sync.md        # URL: /server/sync/
└── sync/          # URL: /server/sync/
    └── _index.md
```

Since mirrored content uses directories and authored content uses named files, this only conflicts if a named file matches an existing directory — which should be avoided.

### Images

Images referenced by a file are stored in an `images/` directory next to the `_index.md` that references them. Image paths in the content use `./images/filename.png`.

## Structure Decisions

### `_index.md` vs named files

- `_index.md` = mirrored from a repository README
- Named file = authored content, no repository counterpart

This convention makes it clear which docs are synced with the repo and which are docs-site-only.

### Flat content root

Content lives directly under `docs/content/`. Zola generates URLs from the directory structure inside `content/`, so `docs/content/server/service/sync/_index.md` becomes `https://dev-docs.msupply.foundation/server/service/sync/`. This keeps URLs clean and avoids redundancy with the domain name. New top-level sections (e.g. `content/guides/`) can be added within the `content/` directory.

### Pass-through directories

Some directories exist only because a child README is deeper in the tree (e.g. `build/` exists only for `build/mac/`). These are kept to maintain the mirror and accommodate future READMEs at those levels.

## CI Check Script

`docs/check-docs-structure.sh` verifies the docs structure stays in sync with the repository:

- **Missing**: flags any tracked README that has no corresponding `_index.md` in `docs/content/`
- **Orphaned**: flags any `_index.md` in `docs/content/` that has no corresponding README in the repo

Run it with:

```bash
./docs/check-docs-structure.sh
```

Example failure output:

```
MISSING: some/new/README.md has no corresponding _index.md at docs/content/some/new/_index.md

Summary: 68 checked, 2 skipped, 1 errors

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
