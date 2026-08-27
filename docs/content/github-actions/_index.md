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

## Self Hosted Runner

We have a self hosted runner for github actions.

For TMF Staff the login details should be in Bitwarden.

To debug, start with this doc from github.
https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/monitoring-and-troubleshooting-self-hosted-runners?platform=mac

The runner is installed in `~/actions-runner/` which is consistent with the docs.

To find the latest log file you can run `ls -r ~/actions-runner/_diag | tail -1`

To see the end of that log file use `tail ~/action-running/_diag/FILENAME_FROM_COMMAND_ABOVE`
