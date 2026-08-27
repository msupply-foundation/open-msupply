+++
title = "Release Process"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Release Team Responsibilities

One Open mSupply team will be responsible for releasing. This will be rotated every two release cycles.

On top of managing the milestone and creating the release, the release team will:

- Triage incoming bugs
- Liaise with QA
- Update docs before the release
- Update the [release spreadsheet](https://docs.google.com/spreadsheets/d/1VmviJcym4owNtLXq2uQRG4k4PHhN3_BJA004m8l3iao) with expected release dates and status

## Daily bug triage

Bugs are created with the `needs daily triage` and `needs triage` labels. Each day, someone from the release team should review all bugs with the `needs daily triage` label assigned.

If the bug is critical and requires a hot fix:
- The `Severity: Hotfix` label should be assigned
- Milestone should be assigned (either patch or current RC)
- A team should be assigned to implement the fix immediately
- Both the `needs daily triage` and `needs triage` labels should be removed

For non-critical bugs:
- Assign a preliminary severity label to help the triage team
- Remove the `needs daily triage` label, keep `needs triage`
- The bug will be properly triaged by the triage team at the next weekly meeting


# Open mSupply Release Process

On the week of the RC release, schedule a demo session with 1 person from each team and the QA team to ensure they have an idea of what they would be testing.

This is the process followed when creating a release. It's written out here as a knowledge sharing process really, those of you who do the releases will know most of this, though perhaps a checklist or reference is helpful.

## Checklist
Here's an outline of the steps to take when making a release. Think of this as your cheatsheet - for more information see the sections below

### RC

* [ ] Check that [weblate](https://translate.msupply.org/projects/open-msupply/#repository) has pushed all changes to the repo before making the release branch!
* [ ] Name the release branch `v*RC` to ensure branch protection e.g. v2.1.0-RC, v1.0.0-RC
* [ ] Update package json from e.g. `2.1.0-develop` to `2.1.0-rc`
* [ ] Publish the branch

The `v*-RC` structure of the branchname will be picked up by our [nightly build process](@/github-actions/nightly-builds/_index.md). Installers for the RC will be built and published each night.

#### Urgent builds

If an urgent build is required, rather than waiting for nightly build, simply create a tag:

- `git tag v2.1.0-rc-170125-2` (this example uses the date + `-2` to help distiguish, but you can use whatever suffix)
- `git push origin tag v2.1.0-rc-170125-2`

The `v` prefix will get picked up by our actions and kick of a build.

### Release

* [ ] Merge feature branch to main
* [ ] Merge main to develop
* [ ] Delete the release branch
* [ ] Create a tag for the release version e.g. `v2.1.0` and push to kick of installers
* [ ] Post in `omSupply Releases` in Telegram to announce the new release

## Branches overview
This is the branching strategy that we're using ([ref](https://github.com/mobify/branching-strategy/tree/master))

![Branching strategy](https://github.com/msupply-foundation/open-msupply/assets/9192912/ddee302d-e3ff-430e-9e0a-c2c8d3cc7d32)

| Branch        | Protected? | Base Branch | Description    |
| :-------------|:-----------|:------------|:---------------|
| `main`      | YES        | N/A         | What is live in production (**stable**).<br/>A pull request is required to merge code into `main`. |
| `develop`     | YES        | `main`    | The latest state of development (**unstable**). |
| feature       | NO         | `develop`   | Cutting-edge features (**unstable**). These branches are used for any maintenance features / active development. |
| `release-vX.Y.Z` | NO      | `develop`    | A temporary release branch that follows the [semver](http://semver.org/) versioning. This is what is sent to UAT.<br/>A pull request is required to merge code into any `release-vX.Y.Z` branch. |
| `hotfix-*`    | NO         | `main`    | These are bug fixes against production.<br/>This is used because develop might have moved on from the last published state.<br/>Remember to merge this back into develop and any release branches. |

### Create and deploy a release
When it comes to release time, the process is as follows:

![Release flow](https://github.com/msupply-foundation/open-msupply/assets/9192912/0ea2699b-fe7b-4e0b-86c5-b0c71ed2cbf4)

We create the release candidate branch after PR merge deadline.

1. Merge `main` into `develop` to ensure the new release will contain the
   latest production code. This reduces the chance of a merge conflict during
   the release.

   ```
   $ git checkout develop
   $ git merge main
   ```

1. Create a new `release-vX.Y.Z` release branch off of `develop`.

   ```
   $ git checkout -b release-vX.Y.Z
   $ git push --set-upstream release-vX.Y.Z
   ```



1. Triage any incomplete issues - move any that won't be finished during RC phase into the Carryover milestone to be re-triaged

1. When the code is ready to release, navigate to the project on
   [Github](https://www.github.com) and open a pull request with the following branch
   settings:
   * Base: `main`
   * Compare: `release-vX.Y.Z`
   Update with details of the release

1. If the version hasn't been bumped in the root `package.json` then do this now

1. At some point in the checklist you will merge the release branch into `main`.
   You can do this by using the "Merge pull request" button on the release PR.

1. Add a tag, this will start a build process on Jenkins

   ```
   git tag vX.Y.Z
   git push origin tag vX.Y.Z
   ```

   note that for the Jenkins build, the tag must start with `v`


1. Now you are ready to create the actual release. Navigate to the [project page](https://github.com/openmsupply/open-msupply/releases)
   on Github and draft a new release (or pre-release for RC versions)
   * Click on the Draft a new release button:
      ![Draft new release button](https://github.com/msupply-foundation/open-msupply/assets/9192912/a078e8d8-53e8-4e04-84d6-11b96d7f99f9)
   * Click on Choose a tag
      ![Choose a tag](https://github.com/msupply-foundation/open-msupply/assets/9192912/473824a5-1894-47eb-9c02-6ee34ac99f62)
   * Select vX.Y.Z from the list
   * This should set the 'previous tag' to 'auto'. Enter the tag as the heading of the release:
      ![Tag heading](https://github.com/msupply-foundation/open-msupply/assets/9192912/0fff0be2-1d15-4001-8697-bf3885f3cb76)

   * Edit the description. This is the format used:
   ```
   ### What's in this release
   [a brief description of the highlights]

   #### Features
   - [bullet point for each feature, with a one-liner about them]

   #### Bugs fixed
   - #[issue number] [hand crafted description]

   **Full Changelog**: https://github.com/openmsupply/open-msupply/compare/v1.1.14...v1.1.15
   ```
   You will find it helpful to click the **Generate release notes** button. This will give you a list of all PRs merged in this release. From there you can rewrite descriptions and gather up a list of changes.
   * Upload the assets
      * Android apk which you've just built
      * All the assets from the jenkins build. Note that dropbox is much faster to download from!
   * Set as latest release
   * Click `Publish release`
   * Post in `omSupply Releases` in Telegram to announce the new release

## QA Cycle


1. Update docs for current version (see below)

1. Do daily triage for critical bugs that may stop the user from using some functionality and add them to the RCx milestone.


### Documentation updates

Public documentation for new features should be written by the team that built the feature. However, PRs for bug fixes/small enhancements throughout the cycle which have UI changes will be assigned a `docs: external` label.

Once in the testing sprint, filter `Done` PRs by `docs: external`, and update any relevant screenshots/descriptions. The `docs: external` label can then be replaced with `docs: done`.

Where possible, teams should write docs as they go, rather than leaving this to the end :)

### QA Process

**Note: QA should always be using the latest RC build for their tests. This means that they should swap to the new RC version if it is available for the rest of their testing.**

1. Write up/update test suites as required
2. Create an epic issue that links to every test suite issue.
3. Test new features first
4. Go through the rest of the other test suites
5. Once the test suites have been completed, individual bug issues can be tested. QA team gets this from their tester board, so please correctly label every issue with the correct milestone.

## Release

1. Merge the `release-vX.Y.Z` into `develop`.

    ```
    $ git checkout develop
    $ git merge release-vX.Y.Z
    $ git push
    ```

2. Close the release PR.

3. Delete the release branch on Github.

4. Delete git tags for previous release (keep tags for this release for reference)

## New Release

At the start of every release:

1. Create an issue describing what is in the release, and pin it to the issue board, this one as an example: https://github.com/msupply-foundation/open-msupply/issues/3840
2. Arrange a meeting with testers and devs to talk about:
   1. Release dates
   2. What each team is doing
   3. What workflows might be affected and therefore what should be prioritised for testing
