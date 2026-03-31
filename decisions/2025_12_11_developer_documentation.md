# Developer documentation

- _Date_: 23/03/2026
- _Deciders_: Andrei, James, Aimee
- _Status_: DECIDED
- _Outcome_: Zola
- _Related Material_: [Issue](https://github.com/msupply-foundation/open-msupply/issues/7247), [Wiki](https://github.com/msupply-foundation/open-msupply/wiki)

## Background

A tool that would help the development team is having accessible clear documentation - hosted in a way that is easy to read and find the relevant information. This would include the README.md files already located throughout the OMS repository, and likely the contents of the OMS wiki. There are a few open questions on what the requirements and priorities are so I'm raising this to begin answering these.

Zola is used for the Open mSupply user docs, however here are some limitations in features - for example search functionality is not 'out of the box' and would require custom implementation.

## Purpose

The purpose of this KDD is to discuss the requirements for the developer documentation site, so that a suitable tool can be selected and implemented.

Before adding a ton of comments... let's schedule a meeting where the general outline can be discussed and documented here.

## Considerations

- Features vs simplicity to create and maintain
- Easy integration of the existing README.md files from the repository
- Integration of other documentation eg wiki, various google docs
- Keeping documentation close to code vs a separate repo or folder for documentation
- Who needs access to view these?
- Who needs access to edit these, and what tradeoffs are there? Eg. UI editing may have no review process and commit to the repo directly

## Technical Specification

### 1. Project Overview

Static site generator in `/docs` that builds from markdown files across repository. READMEs stay in original locations (single source of truth). Pre-build script creates symlinks in `/docs/packages/` to mirror original structure.

### 2. README Discovery & Linking

**Primary:** Pre-build script creates symlinks in `/docs/packages/` to all `README.md` files in `/packages/**`

**Fallback:** If symlinks unsupported, copy files with `sourcePath` frontmatter for correct edit links

**Link Resolution:** Relative links auto-resolved for docs site context

### 3. Search

Client-side full-text search. Results show page title and highlighted snippets with context. Deep linking to sections with auto-scroll and highlight fade.

### 4. Navigation

**Auto-generated:** Landing table of contents, sidebar (from file structure), and page-level TOC (H2/H3 headers)

**Features:** Collapsible sections, persistent state, sticky TOC, active page highlighting

**Custom Ordering:** Define the docs structure via frontmatter or config JSON

### 5. Content Format

GitHub Flavored Markdown (no changes required to existing READMEs). Optional frontmatter for title/order/category. Supports code highlighting, GitHub alerts, tables, task lists, relative links/images.

### 6. Editing Workflow

"Edit this page on GitHub" link on every page → opens source file in GitHub editor → standard PR workflow. Link resolves to actual file path (from symlink or frontmatter).

### 7. Version History

"View History" link to GitHub commits. Page metadata shows last updated timestamp and contributor (from git, embedded at build time).

### 8. Configuration

**Minimal Configuration:**

```json
{
  "title": "Open mSupply Documentation",
  "description": "Developer documentation",
  "repo": "https://github.com/org/repo",
  "logo": "/logo.svg",
  "theme": {
    "primaryColor": "#0066cc"
  }
}
```

**Optional:**

- Custom navigation ordering
- Footer links
- Light/dark mode (respects system preference)

### 9. Build Process

1. Discover READMEs → create symlinks → transform links
2. Build site → generate search index → output static files

**CI/CD:** Auto-deploy on push to main/develop or `*.md` changes

## Initial Options

<details>

<summary>
Initial options considered before specs revision.
Option 1 (Zola) could still potentially be used

- Option 1: Zola
- Option 2: Wiki.js
- Option 3: DokuWiki (OG Docs tool)

</summary>
All options will require some set up and configuration effort, and change the place where README.md files are stored and edited. The existing README.md files in the OMS repository can instead contain a link to the relevant page in the documentation site.

Other documentation in various places eg Google docs will likely need reformatting to the new documentation type and location regardless of the chosen option.

### Option 1: Zola

Use Zola as the static site generator for the developer documentation, similar to the user documentation.

A separate repository will be required to store the documentation. Will need to link to the relevant README.md files in the OMS repository.

_Pros:_

- Familiar tool for the team
- Lower set up effort for a basic documentation site
- Can use learnings/features from the user documentation site
- Can be easily versioned for different releases of OMS

_Cons:_

- Limited features or need custom implementation (eg search is custom in the user docs, no contents page support)
- No UI editing - will need to edit markdown files and commit to the repository = more time consuming, though we would have the option to require PR reviews or allow direct commits
- Requires a build and deploy pipeline

### Option 2: Wiki.js

Wiki.js is a free, open-source tool for wiki-style documentation sites. It has options to choose search engine, authentication options, comments etc.
A separate repository will be required to store the documentation. Will need to link to the relevant README.md files in the OMS repository.

_Pros:_

- Has search features available as a documentation site out of the box
- Sync to and from a git repository: use existing README.md files in OMS repository
- Edit directly in the UI and have changes pushed to the repository, or use a text editor with markdown
- Folders are generated by path name - no additional folders or structure needed
- Polished UI, easy navigation
- Configurable user rights for editing pages

_Cons:_

- Requires learning and set up of a new tool, will take some time to set up and configure
- May be more complex than needed for mostly internal documentation
- Risk of overwriting or drift if allowing edits in multiple places
- Requires a database, updates and backups

### Option 3: DokuWiki (OG Docs tool)

DokuWiki is an open source wiki tool that is used for OG mSupply documentation.

It can be set up without a database or repository, README.md files in the OMS repository could link to the relevant pages in DokuWiki.

_Pros:_

- Familiar tool for the team
- Edit directly in the UI by page or section
- Version history is easy to view in the UI
- Has search feature and automatic contents page generation
- Plugins and theming templates are available for extending functionality
- Configurable user rights for editing pages

_Cons:_

- Doesn't use traditional markdown. Plugins can convert markdown to DokuWiki format but may lose some formatting
- No native github integration. Would need to use plugins which may be fragile with DokuWiki versions
- Could have significant time investment to generate initial documentation pages from existing README.md files, and harder to move away from DokuWiki later if needed

</details>

## Revised Options Comparison

[!NOTE] The following comparison is AI generated based on the technical specs provided above. These have not been individually verified.

## README Discovery & Single Source of Truth

| Feature                            | VitePress    | Docusaurus   | Nextra       | Fumadocs     | Starlight    | Zola             |
| ---------------------------------- | ------------ | ------------ | ------------ | ------------ | ------------ | ---------------- |
| **Symlink support**                | 🟢 Native    | 🟢 Native    | 🟢 Native    | 🟢 Native    | 🟢 Native    | 🟢 Native        |
| **Custom pre-build script needed** | 🟡 Yes       | 🟡 Yes       | 🟡 Yes       | 🟡 Yes       | 🟡 Yes       | 🟡 Yes           |
| **Link transformation**            | 🟢 Built-in  | 🟢 Built-in  | 🟢 Built-in  | 🟢 Built-in  | 🟢 Built-in  | 🟡 Manual config |
| **Frontmatter support**            | 🟢 Excellent | 🟢 Excellent | 🟢 Excellent | 🟢 Excellent | 🟢 Excellent | 🟢 Excellent     |

---

## Search Capabilities

| Feature                       | VitePress             | Docusaurus       | Nextra        | Fumadocs              | Starlight    | Zola           |
| ----------------------------- | --------------------- | ---------------- | ------------- | --------------------- | ------------ | -------------- |
| **Built-in search**           | 🟢 Local (MiniSearch) | 🟢 Yes (Algolia) | 🟢 FlexSearch | 🟢 FlexSearch/Algolia | 🟢 Pagefind  | 🟡 Elasticlunr |
| **External service required** | 🟢 No                 | 🔴 Yes (Algolia) | 🟢 No         | 🟢 No (optional)      | 🟢 No        | 🟢 No          |
| **Search quality**            | 🟢 Excellent          | 🟢 Excellent     | 🟢 Good       | 🟢 Good               | 🟢 Excellent | 🟡 Basic       |
| **Context snippets**          | 🟢 Yes                | 🟢 Yes           | 🟢 Yes        | 🟢 Yes                | 🟢 Yes       | 🔴 Limited     |
| **Highlighting**              | 🟢 Yes                | 🟢 Yes           | 🟡 Basic      | 🟡 Basic              | 🟢 Yes       | 🔴 No          |
| **Section-level navigation**  | 🟢 Yes                | 🟢 Yes           | 🟡 Limited    | 🟡 Limited            | 🟢 Yes       | 🔴 No          |
| **Deep linking**              | 🟢 Yes                | 🟢 Yes           | 🟢 Yes        | 🟢 Yes                | 🟢 Yes       | 🟡 Manual      |
| **Offline capable**           | 🟢 Yes                | 🔴 No            | 🟢 Yes        | 🟢 Yes                | 🟢 Yes       | 🟢 Yes         |

---

## Navigation & Structure

| Feature                    | VitePress             | Docusaurus            | Nextra                | Fumadocs              | Starlight             | Zola                  |
| -------------------------- | --------------------- | --------------------- | --------------------- | --------------------- | --------------------- | --------------------- |
| **Auto-generated sidebar** | 🟢 Yes                | 🟡 Semi-auto          | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟡 Semi-manual        |
| **Auto-generated TOC**     | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                |
| **Collapsible sections**   | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟡 Custom JS needed   |
| **Breadcrumbs**            | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟡 Custom template    |
| **Custom ordering**        | 🟢 Config/frontmatter | 🟢 Config/frontmatter | 🟢 Config/frontmatter | 🟢 Config/frontmatter | 🟢 Config/frontmatter | 🟢 Config/frontmatter |
| **Persistent state**       | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟡 Custom JS needed   |
| **Sticky TOC**             | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟢 Yes                | 🟡 Custom CSS needed  |

---

## Content Format Support

| Feature                      | VitePress        | Docusaurus       | Nextra           | Fumadocs         | Starlight        | Zola                 |
| ---------------------------- | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- | -------------------- |
| **GitHub Flavored Markdown** | 🟢 Full support  | 🟢 Full support  | 🟢 Full support  | 🟢 Full support  | 🟢 Full support  | 🟡 Most features     |
| **Code syntax highlighting** | 🟢 Shiki         | 🟢 Prism         | 🟢 Prism/Shiki   | 🟢 Shiki         | 🟢 Shiki         | 🟢 Built-in          |
| **GitHub-style alerts**      | 🟢 Native        | 🟡 Via plugin    | 🟡 Via plugin    | 🟢 Native        | 🟢 Native        | 🔴 Manual shortcodes |
| **Relative links**           | 🟢 Auto-resolved | 🟢 Auto-resolved | 🟢 Auto-resolved | 🟢 Auto-resolved | 🟢 Auto-resolved | 🟢 Auto-resolved     |
| **Image handling**           | 🟢 Excellent     | 🟢 Excellent     | 🟢 Excellent     | 🟢 Excellent     | 🟢 Excellent     | 🟢 Good              |
| **Tables**                   | 🟢 Yes           | 🟢 Yes           | 🟢 Yes           | 🟢 Yes           | 🟢 Yes           | 🟢 Yes               |
| **Task lists**               | 🟢 Yes           | 🟢 Yes           | 🟢 Yes           | 🟢 Yes           | 🟢 Yes           | 🟡 Limited           |
| **MDX support**              | 🔴 No            | 🟢 Yes           | 🟢 Yes           | 🟢 Yes           | 🟢 Yes           | 🔴 No                |

---

## Editing Workflow

| Feature                         | VitePress    | Docusaurus   | Nextra       | Fumadocs     | Starlight    | Zola               |
| ------------------------------- | ------------ | ------------ | ------------ | ------------ | ------------ | ------------------ |
| **Edit link configuration**     | 🟢 Built-in  | 🟢 Built-in  | 🟢 Built-in  | 🟢 Built-in  | 🟢 Built-in  | 🟡 Manual template |
| **Custom link resolver**        | 🟢 Easy      | 🟢 Easy      | 🟢 Easy      | 🟢 Easy      | 🟢 Easy      | 🟡 Template logic  |
| **Symlink path resolution**     | 🟢 Automatic | 🟢 Automatic | 🟢 Automatic | 🟢 Automatic | 🟢 Automatic | 🟡 Manual tracking |
| **Frontmatter source tracking** | 🟢 Supported | 🟢 Supported | 🟢 Supported | 🟢 Supported | 🟢 Supported | 🟢 Supported       |

---

## Version History & Git Integration

| Feature                    | VitePress      | Docusaurus     | Nextra         | Fumadocs       | Starlight      | Zola               |
| -------------------------- | -------------- | -------------- | -------------- | -------------- | -------------- | ------------------ |
| **Last updated timestamp** | 🟢 Built-in    | 🟢 Built-in    | 🟡 Manual      | 🟡 Manual      | 🟢 Built-in    | 🔴 No built-in     |
| **Contributor info**       | 🟢 Built-in    | 🟢 Built-in    | 🔴 No          | 🔴 No          | 🟢 Built-in    | 🔴 No built-in     |
| **Git history links**      | 🟢 Easy config | 🟢 Easy config | 🟢 Easy config | 🟢 Easy config | 🟢 Easy config | 🟡 Manual template |
| **Automatic git metadata** | 🟢 Yes         | 🟢 Yes         | 🔴 No          | 🔴 No          | 🟢 Yes         | 🔴 No              |

---

## Configuration & Customization

| Feature                   | VitePress       | Docusaurus   | Nextra          | Fumadocs        | Starlight       | Zola                     |
| ------------------------- | --------------- | ------------ | --------------- | --------------- | --------------- | ------------------------ |
| **Minimal config needed** | 🟢 Very minimal | 🟡 Moderate  | 🟢 Very minimal | 🟢 Very minimal | 🟢 Very minimal | 🟢 Minimal               |
| **TypeScript config**     | 🟢 Yes          | 🟢 Yes       | 🟢 Yes          | 🟢 Native       | 🟢 Yes          | 🔴 TOML only             |
| **Theme customization**   | 🟢 CSS vars     | 🟢 CSS/React | 🟢 CSS/React    | 🟢 CSS/React    | 🟢 CSS/Props    | 🟢 CSS/Tera templates    |
| **Light/dark mode**       | 🟢 Built-in     | 🟢 Built-in  | 🟢 Built-in     | 🟢 Built-in     | 🟢 Built-in     | 🟡 Custom implementation |
| **Logo/branding**         | 🟢 Simple       | 🟢 Simple    | 🟢 Simple       | 🟢 Simple       | 🟢 Simple       | 🟢 Simple                |

---

## Build & Performance

| Feature                 | VitePress    | Docusaurus   | Nextra       | Fumadocs     | Starlight    | Zola                  |
| ----------------------- | ------------ | ------------ | ------------ | ------------ | ------------ | --------------------- |
| **Build speed**         | 🟢 Fastest   | 🟡 Moderate  | 🟢 Fast      | 🟢 Fast      | 🟢 Fast      | 🟢 **Extremely fast** |
| **Runtime performance** | 🟢 Excellent | 🟡 Good      | 🟢 Very good | 🟢 Very good | 🟢 Excellent | 🟢 Excellent          |
| **Bundle size**         | 🟢 Small     | 🟡 Large     | 🟡 Medium    | 🟡 Medium    | 🟢 Smallest  | 🟢 Very small         |
| **Hot reload**          | 🟢 Instant   | 🟢 Fast      | 🟢 Fast      | 🟢 Fast      | 🟢 Instant   | 🟢 Instant            |
| **Incremental builds**  | 🟢 Yes       | 🟡 Limited   | 🟢 Yes       | 🟢 Yes       | 🟢 Yes       | 🟢 Yes                |
| **Single binary**       | 🔴 No (Node) | 🔴 No (Node) | 🔴 No (Node) | 🔴 No (Node) | 🔴 No (Node) | 🟢 **Yes**            |

---

## Technology Stack Alignment

| Feature                          | VitePress              | Docusaurus          | Nextra              | Fumadocs            | Starlight           | Zola                       |
| -------------------------------- | ---------------------- | ------------------- | ------------------- | ------------------- | ------------------- | -------------------------- |
| **Framework**                    | Vue 3                  | React               | Next.js/React       | Next.js/React       | Astro               | **Rust**                   |
| **Alignment with TS/React/Rust** | 🟡 Different           | 🟢 Partial          | 🟢 Partial          | 🟢 Partial          | 🟡 Different        | 🟢 **Rust match**          |
| **Learning curve**               | 🟢 Low (just markdown) | 🟢 Low              | 🟢 Low              | 🟢 Low              | 🟡 Medium           | 🟡 Medium (Tera templates) |
| **Team familiarity**             | 🟡 New framework       | 🟢 Familiar         | 🟢 Familiar         | 🟢 Familiar         | 🟡 New framework    | 🟢 **Already used**        |
| **Component extension**          | 🟡 Vue components      | 🟢 React components | 🟢 React components | 🟢 React components | 🟢 React components | 🟡 Tera shortcodes         |

---

## Maturity & Ecosystem

| Feature                   | VitePress       | Docusaurus     | Nextra     | Fumadocs   | Starlight     | Zola            |
| ------------------------- | --------------- | -------------- | ---------- | ---------- | ------------- | --------------- |
| **Maturity**              | 🟢 Stable (v1+) | 🟢 Very mature | 🟡 Stable  | 🟡 New     | 🟡 Stable     | 🟢 Very stable  |
| **Community size**        | 🟢 Large        | 🟢 Very large  | 🟡 Medium  | 🔴 Small   | 🟡 Growing    | 🟡 Medium       |
| **Documentation quality** | 🟢 Excellent    | 🟢 Excellent   | 🟢 Good    | 🟡 Good    | 🟢 Excellent  | 🟢 Good         |
| **Plugin ecosystem**      | 🟡 Growing      | 🟢 Extensive   | 🟡 Limited | 🟡 Limited | 🟡 Growing    | 🔴 Very limited |
| **Maintenance**           | 🟢 Vue team     | 🟢 Meta        | 🟢 Active  | 🟢 Active  | 🟢 Astro team | 🟢 Active       |
| **GitHub stars**          | 🟢 12k+         | 🟢 55k+        | 🟢 11k+    | 🟡 2k+     | 🟢 5k+        | 🟢 13k+         |
| **Theme availability**    | 🟢 Multiple     | 🟢 Many        | 🟡 Few     | 🟡 Few     | 🟢 Several    | 🟡 Limited      |

---

## Deployment & CI/CD

| Feature                     | VitePress     | Docusaurus    | Nextra        | Fumadocs      | Starlight     | Zola                 |
| --------------------------- | ------------- | ------------- | ------------- | ------------- | ------------- | -------------------- |
| **GitHub Pages support**    | 🟢 Native     | 🟢 Native     | 🟢 Yes        | 🟢 Yes        | 🟢 Yes        | 🟢 Native            |
| **Static export**           | 🟢 Yes        | 🟢 Yes        | 🟢 Yes        | 🟢 Yes        | 🟢 Yes        | 🟢 Yes               |
| **GitHub Actions examples** | 🟢 Official   | 🟢 Official   | 🟢 Available  | 🟡 Community  | 🟢 Official   | 🟢 Official          |
| **Build reliability**       | 🟢 Excellent  | 🟢 Excellent  | 🟢 Good       | 🟡 Good       | 🟢 Excellent  | 🟢 Excellent         |
| **CI/CD simplicity**        | 🟡 Node setup | 🟡 Node setup | 🟡 Node setup | 🟡 Node setup | 🟡 Node setup | 🟢 **Single binary** |

---

## Documentation-Specific Features

| Feature                 | VitePress   | Docusaurus   | Nextra      | Fumadocs    | Starlight    | Zola               |
| ----------------------- | ----------- | ------------ | ----------- | ----------- | ------------ | ------------------ |
| **Built for docs**      | 🟢 Yes      | 🟢 Yes       | 🟢 Yes      | 🟢 Yes      | 🟢 Yes       | 🟡 General purpose |
| **API docs generation** | 🟡 Limited  | 🟢 Good      | 🟡 Limited  | 🟢 Good     | 🟡 Limited   | 🔴 No              |
| **Versioning support**  | 🟡 Basic    | 🟢 Excellent | 🟡 Basic    | 🟡 Basic    | 🟡 Basic     | 🔴 Manual          |
| **i18n support**        | 🟢 Built-in | 🟢 Excellent | 🟢 Built-in | 🟢 Built-in | 🟢 Excellent | 🟡 Manual          |

---

## Overall Score Summary

| Category            | VitePress | Docusaurus | Nextra   | Fumadocs | Starlight | Zola         |
| ------------------- | --------- | ---------- | -------- | -------- | --------- | ------------ |
| **Search**          | 🟢 10/10  | 🟡 7/10    | 🟢 8/10  | 🟢 8/10  | 🟢 9/10   | 🔴 **4/10**  |
| **Navigation**      | 🟢 10/10  | 🟢 10/10   | 🟢 9/10  | 🟢 9/10  | 🟢 10/10  | 🟡 **6/10**  |
| **Content Support** | 🟢 9/10   | 🟢 10/10   | 🟢 10/10 | 🟢 10/10 | 🟢 10/10  | 🟡 **7/10**  |
| **Git Integration** | 🟢 10/10  | 🟢 10/10   | 🟡 6/10  | 🟡 6/10  | 🟢 10/10  | 🔴 **3/10**  |
| **Performance**     | 🟢 10/10  | 🟡 7/10    | 🟢 8/10  | 🟢 8/10  | 🟢 10/10  | 🟢 **10/10** |
| **Stack Alignment** | 🟡 6/10   | 🟢 10/10   | 🟢 10/10 | 🟢 10/10 | 🟡 6/10   | 🟢 **9/10**  |
| **Maturity**        | 🟢 9/10   | 🟢 10/10   | 🟢 8/10  | 🟡 6/10  | 🟢 8/10   | 🟢 **9/10**  |
| **Ease of Setup**   | 🟢 10/10  | 🟡 7/10    | 🟢 9/10  | 🟢 9/10  | 🟢 9/10   | 🟡 **7/10**  |
| **TOTAL**           | 🟢 74/80  | 🟢 71/80   | 🟢 68/80 | 🟡 66/80 | 🟢 72/80  | 🟡 **55/80** |

## Decision

Discussed the options and overarching structural considerations. Agreed on having current READMEs moved to a docs/ directory, where the tool would serve them to a site via GitHub Pages.

- Documentation can be browsed in code in the docs/ folder, as well as on the served site.
- Original READMEs should remain in place with links to the site and new content file.This was in preference to having docs in a separate repository, which was required for the initial option set. All options in the compared set required content to be grouped together.

We looked at an alternate option, Hugo, which we hoped would allow READMEs to remain in place. After trialling the setup, we determined it would not allow this without significant customisation, so Hugo presented similar challenges to the other compared options.

With docs in a directory together, and especially with AI advancements, trialling or changing to a different tool at a later date would take less overhead than it previously would have. The main focus was on getting the documentation site underway.

Discussion points included users and editing:

- The initial meeting with the development team focused heavily on in-place editing and ease of editing. The assessed options don't have in-place editing, as the tools that allowed this required a separate documentation repository. These tools do allow a link to - GitHub where the markdown can be edited and committed or a pull request created.
- Users are likely to be mainly developers and the product team. GitHub editing should be sufficient for updates — we will assess for pain points when implemented. Again, all options have similar constraints.
- This documentation shouldn't include specs or project-level information, but should have high-level overviews.

Ultimately decided to use Zola for these main reasons:

- Zola is already used for the user docs — provides familiarity and shared learning across a common tool
- Easily customisable similar to the user docs
- Zola is stable and long-term. Some other options were newer and less proven over time
