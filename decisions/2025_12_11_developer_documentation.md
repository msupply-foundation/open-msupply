# Developer documentation

- _Date_: 11/12/2025
- _Deciders_:
- _Status_: NEW
- _Outcome_:
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

### What features are must-haves vs nice-to-haves?

- Automation of updating the site when README.md contents are updated
- Automation of updating the navigation and file structure when files are created/moved/renamed
- Search functionality
- Navigation structure (sidebar, table of contents, etc)
- Images, diagrams and media support
- Importance of custom or polished UI
- API documentation
- PR process of preview of changes before publishing

## Requirements

## Options

## Decision
