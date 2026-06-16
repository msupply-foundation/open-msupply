+++
title = "Feature Development"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Feature Development

## Feature branches

We do use feature branches for specific cases; these should be short lived however, to avoid issues in keeping feature and development branches synchronised. The general rule is that the development branch should regularly be merged back into the feature branch to keep it current.

When the feature is complete, create a PR to merge the entire branch into develop, even though the individual commits have been PR'd into the feature branch. This is for consistency, to comply with branch protection rules, and to ensure visibility of changes.

## Feature flags

Rather than creating an entire feature branch, another approach is to create a feature flag and control the visibility of changes with that. A new API implementation can exist safely and UI components can be enabled and/or visible only when the flag is enabled. This allows development to continue without changing the user experience, all in the develop branch.

A limitation is that the flag is enabled only at compile time, so is not suitable for dynamically enabling or disabling a feature on a demo server. You could compile a feature-enabled version and deploy that to a feature server though.

### Adding a feature flag

In `packages/config/src/config.ts`, at the top of the file, add a const:

```
declare const FEATURE_COOL_NEW_THING: boolean;
```

and then, just before the end of file, add to the `Environment` object:

```
  FEATURE_COOL_NEW_THING:
    typeof FEATURE_COOL_NEW_THING === 'undefined'
      ? false
      : FEATURE_COOL_NEW_THING,
```

In `packages/host/webpack.config.js` add to the `DefinePlugin` plugin:

```
    plugins: [
      ...
      new webpack.DefinePlugin({
        FEATURE_COOL_NEW_THING: env.FEATURE_COOL_NEW_THING,
        ...
      }),
      ...
```

### Usage

With this in place you can do the following in your page:

```
import { Environment } from '@openmsupply-client/config';

...

if (Environment.FEATURE_COOL_NEW_THING) {
  // do something cool
}

```

The flag can be set when running the script `start-local-features` e.g.

```
yarn start-local-features FEATURE_COOL_NEW_THING=true
```
