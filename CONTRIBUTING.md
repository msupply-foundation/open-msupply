# Contributing to Open mSupply

:tada: First off, thanks for considering contributing to Open mSupply! :tada:

This repository is a **filtered mirror** of the private repo where Open mSupply is developed
(see [About this mirror](README.md#about-this-mirror) in the README). That changes one thing about
contributing: pull requests are reviewed here, then imported into the private repo and merged
there, and the change flows back out with the next sync. Everything else is an ordinary GitHub
fork-and-pull-request workflow.

These are guidelines, not rules. Use your best judgment, and feel free to propose changes to this
document in a pull request.

## Where do I go from here?

If you have noticed a bug or have a feature request,
[open an issue](https://github.com/msupply-foundation/open-msupply/issues/new/choose). There are
templates; please fill in as much of the pre-defined sections as you can. It is generally best to
get confirmation of a bug or approval for a feature request before starting to code.

The issue tracker is for bugs and feature requests. Accepted reports are recreated in the private
tracker for the team to work on, and the public issue is linked and closed when the fix reaches
this mirror.

Working on your first pull request? You might find <http://makeapullrequest.com/> and
<http://www.firsttimersonly.com/> helpful.

## Fork and create a branch

[Fork Open mSupply](https://github.com/msupply-foundation/open-msupply/fork) and create a branch
from `develop` with a descriptive name. Every pull request should have a corresponding issue, and
the description should reference it (for example `Fixes #325`):

```sh
git checkout -b 325-fix-a-bug develop
```

Because this repo's history can be republished when the publishing rules change (see the README),
keep your branch short-lived and rebase onto `develop` before opening the pull request. If a
republication happens while your branch is open, rebase again; the commits you are building on
will have new SHAs but the same content.

## Get the code running

The repo holds a Rust server and two web clients. Each has its own README with the full setup:

- **Server**: [server/README.md](server/README.md). The Rust toolchain is pinned by
  `server/rust-toolchain.toml`, so `rustup` picks the right version for you.
- **SolidJS frontend** (the UI going forward): [frontend/README.md](frontend/README.md). It uses
  `pnpm`, managed through `corepack`.
- **React client** (the original UI, also packaged for desktop and Android):
  [client/README.md](client/README.md). It uses `yarn`, also through `corepack`; the Node version
  is pinned by `client/.nvmrc`.

To run the whole stack locally without a legacy mSupply server, initialise a database from the
bundled reference data:

```sh
corepack enable            # once
yarn install               # from the repo root; installs the client workspaces
cd server
cargo run --bin remote_server_cli -- initialise-from-export -n reference1
cd ..
yarn start                 # server + React client
```

Login credentials are printed by the CLI and listed in `server/data/reference1/users.txt`.

### Tests

```sh
cd server && cargo test                 # or `cargo nextest run` if you have nextest installed
cd client && yarn test
cd frontend && pnpm test
```

### Style

Your change should pass the same checks as the rest of the project. Each part has its own
formatter and linter:

```sh
cd server && cargo fmt && cargo clippy
cd client && yarn lint-and-format
cd frontend && pnpm check && pnpm lint
```

## Make a pull request

Rebase your branch onto the latest `develop` and push it to your fork:

```sh
git remote add upstream git@github.com:msupply-foundation/open-msupply.git
git fetch upstream
git rebase upstream/develop
git push --set-upstream origin 325-fix-a-bug
```

Then open a pull request against `msupply-foundation/open-msupply`, base branch `develop`.
Referencing `#325` in the description links it to the issue here.

**No CI runs on this repo.** Please list in the description the checks you ran locally
(`cargo test`, `yarn test`, `pnpm check`, and so on). Maintainers run the full suite on the
imported branch.

## What happens next

1. **Triage.** A maintainer looks at the pull request within a working week and labels it:
   - `imported`: accepted and imported into the private repo;
   - `needs-changes`: review comments have been left here, as on any pull request;
   - `declined`: with a reason.
2. **Import.** The commits are applied to a branch in the private repo as patches, so your name
   and email stay on them as the author. Any conflicts with newer internal work are resolved
   there.
3. **Review, CI and merge** happen in the private repo, like any other change.
4. **Sync.** The merged change reaches this mirror with the next sync, nightly or sooner. Your
   pull request is then **closed, not merged**, with a comment naming the commit here that it
   landed as. The commit carries your authorship.

If a maintainer asks you to rebase, a lot has changed underneath your branch:

```sh
git fetch upstream
git rebase upstream/develop
git push --force-with-lease origin 325-fix-a-bug
```

Thanks! Your contribution is much appreciated.
