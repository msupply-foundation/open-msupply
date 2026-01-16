# Contributing to Open mSupply

:tada: First off, thanks for considering contributing to open mSupply! :tada:

The following is a set of guidelines for contributing to open mSupply. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.
Following the guidelines shows us that you respect the time of the developers managing and developing this open source project. In return, they'll try their best to help in assessing changes, reviewing and merging as best they can!

### Where do I go from here?

If you've noticed a bug or have a feature request, [make one][new issue]! There are templates for creating issues, please try to fill in as much as you can of the pre-defined sections. That really helps!
It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

Note that the issue tracker is only for bugs and feature requests. If you have a general question, please ask elsewhere.

The best place to start are the issues which have the label [good first issue](https://github.com/msupply-foundation/open-msupply/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

Working on your first Pull Request? You might find http://makeapullrequest.com/ and http://www.firsttimersonly.com/ helpful.

### Fork & create a branch

If this is something you think you can fix, then [fork Open mSupply] and create a branch with a descriptive name.

Every Pull Request should have a corresponding issue in the upstream repo, and the PR description should reference it (e.g. `Fixes #325`).

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-fix-a-bug
```

We're using the ticket number to start the branch name, and dropping the `#` because that can be a pain when using command line tools.

### Get the test suite running

Toolchains:

- Rust is pinned via `server/rust-toolchain.toml` (currently `1.88`). If you're using rustup, it will prompt you to install the right version when you run `cargo`.
- Client requires Node.js `v20+` and Yarn (see `client/README.md`).
- For platform-specific system dependencies (e.g. `libpq` on Apple Silicon), see `server/README.md#dependencies`.

To get started, have a look at the [readme](README.md)

The repo is split into a client and server application - you'll need to have a look at both individual readme files to get the full app running. 
For the client app, clone the repo, install packages

```sh
cd ./client
yarn install
```

and you can then run the client tests:

```sh
yarn test
```

For the server app, you'll need rust installed - and then you can 

```sh
cd ./server
cargo test
```


### Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help;
everyone is a beginner at first :smile_cat:

### View your changes in the client application

To see the application running, you can get up and running quickly in one of two ways:

```sh
# Option 1: run server + client locally (requires Rust + Node)
yarn start

# Option 2: run client against the demo server API (no Rust required)
cd ./client
yarn start-remote

# Option 3: run full stack locally without legacy mSupply (initialise from bundled reference data)
cd ./server
cargo run --bin remote_server_cli -- initialise-from-export -n reference1
cd ..
yarn start
```

This will compile the React app and launch a browser on <http://localhost:3003>. We're using mostly chrome and firefox.. but you be you!
Running `yarn start-remote` will connect you to our [demo server](https://demo-open.msupply.org/)
You can log in using:

*User*: developer
*Password*: password

Note: `initialise-from-export` currently emits a large number of warnings (see #10241), but should still create a usable local database. Login credentials are printed in the CLI output and are also listed in `server/data/reference1/users.txt`.

### Get the style right

Your patch should follow the same conventions & pass the same code quality checks as the rest of the project. We're using prettier for the react app, and there is typescript validation required before you can commit.
The valdiation is running 

```sh
cd ./client
yarn lint-and-format
```

and you can run that yourself to test!

### Make a Pull Request

At this point, you should switch back to your main branch and make sure it's
up to date with open mSupply's develop branch:

```sh
git remote add upstream git@github.com:msupply-foundation/open-msupply.git
git checkout develop
git pull upstream develop
```

Then update your feature branch from your local copy of develop, and push it!

```sh
git checkout 325-fix-a-bug
git rebase develop
git push --set-upstream origin 325-fix-a-bug
```

Finally, go to GitHub and [make a Pull Request][] :D

#### Fork PR notes (issues + CI)

- **Target the upstream repo**: make sure the base repository is `msupply-foundation/open-msupply` and the base branch is `develop`. Referencing `#123` will then link to the upstream issue tracker.
- **Reference the issue**: include something like `Fixes #123` or `Refs #123` in the PR description.
- **CI permissions on forks**: GitHub restricts what Actions can do on PRs opened from forks (e.g. limited token permissions, no access to secrets). Some checks (especially ones that try to comment on PRs) may be skipped or show as failing even though build/tests pass.
  - If this happens, include the commands you ran locally in the PR description (`yarn test`, `cargo test`, etc.).
  - Maintainers may re-run workflows with the required permissions, or disable untrusted workflows for additional protection.
- **Disable Actions on your fork** (optional): if you don't want GitHub Actions running on your fork, you can disable it in your fork repo settings.
- **Use a token in your fork** (optional): if you need a workflow to comment/write during Actions runs on *your fork*, add a personal access token as a secret in your fork repo settings (never commit tokens to the repo).

Github Actions will run our test suite for changes to the server. An action will run to check the bundle size for client changes. 
We care about quality, so your PR won't be merged until all tests pass.

Thanks!! It's great to get to this point - and your contribution is much appreciated!
From here - the maintainers will review and give you feedback, possibly asking for changes. Once approved, they'll merge the pull request and you're done!

### Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

To learn more about rebasing in Git, there are a lot of [good][git rebasing] [resources][interactive rebase] but here's the suggested workflow:

```sh
git checkout 325-fix-a-bug
git pull --rebase upstream develop
git push --force-with-lease origin 325-fix-a-bug
```

[Stack Overflow]: http://stackoverflow.com/questions/tagged/activeadmin
[new issue]: https://github.com/msupply-foundation/open-msupply/issues/new/choose
[fork Open mSupply]: https://github.com/msupply-foundation/open-msupply/fork
[make a pull request]: https://help.github.com/articles/creating-a-pull-request
[git rebasing]: http://git-scm.com/book/en/Git-Branching-Rebasing
[interactive rebase]: https://help.github.com/en/github/using-git/about-git-rebase
[shortcut reference links]: https://github.github.com/gfm/#shortcut-reference-link
[Yarn]: https://yarnpkg.com/en/docs/install
[Node.js]: https://nodejs.org/en/
