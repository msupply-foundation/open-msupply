+++
title = "GitHub Actions"
weight = 80
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# GitHub Actions

Documentation for our GitHub Actions workflows. See also:

- [Nightly Automated Builds](@/github-actions/nightly-builds/_index.md)
- [Client Code Checks](@/github-actions/client-code-checks/_index.md)
- [Self-hosted Linux runner setup](@/github-actions/self-hosted-runners/_index.md) — the Linux build/deploy lanes and the deploy box
- [Docker](@/docker/_index.md) — the image build, releases and deployments

## Self Hosted Runner

We have a self hosted runner for github actions.

For TMF Staff the login details should be in Bitwarden.

To debug, start with this doc from github.
https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/monitoring-and-troubleshooting-self-hosted-runners?platform=mac

The runner is installed in `~/actions-runner/` which is consistent with the docs.

To find the latest log file you can run `ls -r ~/actions-runner/_diag | tail -1`

To see the end of that log file use `tail ~/actions-runner/_diag/FILENAME_FROM_COMMAND_ABOVE`

## Testing a workflow before it is merged

A `workflow_dispatch` workflow can be run from a branch, with the branch's own version of the workflow file, before it is merged anywhere:

```bash
gh workflow run <file>.yaml --ref <branch> -f name=value
```

Two different refs are in play, which is the part that catches people out: `--ref` selects **which workflow code runs** (including any `uses: ./.github/workflows/...` it calls, which resolve at that same ref), while a workflow's own inputs may separately name **what it should act on**. GitHub reads the inputs, their defaults and their `choice` lists from the file at `--ref`, so the form you get is the branch's form, not the default branch's.

The catch is that this only works once the workflow holds an id in the repository's Actions registry, and an id is assigned the first time a run is created from *any* ref. So:

| the workflow has | dispatchable from a branch? |
|---|---|
| `push`, `pull_request` or tag triggers | yes — those fire from the branch itself and assign the id as a side effect |
| already merged to `develop` | yes |
| only `workflow_dispatch` | **no** — 404s until it has run once |
| only `workflow_dispatch` and `schedule` | **no** — `schedule` fires solely on the default branch, so it can never self-register |

To register one in the last two cases without merging it, add a branch-scoped `push` trigger and guard the entry job so that run does nothing:

```yaml
on:
  push:
    branches: [my-branch]   # TEMP
  workflow_dispatch:

jobs:
  plan:
    if: github.event_name != 'push'   # TEMP
```

Pushing that creates one run, which skips every job — no runner time, no side effects — and the workflow is dispatchable from then on. Dispatched runs are unaffected, because `github.event_name` is `workflow_dispatch` and the guard passes. Remove both lines before merging.

Note that the "Run workflow" button in the Actions tab is a separate matter: that genuinely requires the file to be on the default branch, so expect to use the CLI until then.
