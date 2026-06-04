+++
title = "Refactoring"
weight = 40
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Refactoring code

Refactoring code is an important part of the lifecycle of software.
As we add features, or learn new techniques it often makes sense to make significant code changes to support improved maintainability in future.

However, refactoring can often be a contentious area, and not everyone might agree on the best approach.
It can also take time away from developing features, or making bug fixes.

Refactors needs to be weighed up against these factors and planned in as part of the sprint planning work.

> [!NOTE]
> AI assistants make mechanical refactors — renames, signature changes, threading a new parameter through, applying a pattern across many call sites — substantially cheaper than they used to be. That tilts the cost/benefit calculus on smaller refactors, and some changes that would previously have been "raise an issue, prioritise later" are now reasonable to include in the current PR.
>
> The catch is review: AI-driven refactors can quietly change behaviour at edges the prompt didn't cover, so widen the review (and the tests) when accepting one. The bigger the blast radius, the more this matters.

## Refactor Process

* Discuss with a teammate first to make sure that more than one person sees the value of the change
* Raise a new Github Issue For Refactor (using the refactor issue template)
> In some cases, where a small refactor is needed and is directly related to the task, the team might agree that a separate issue isn't needed
* Discuss the issue with the wider team, if it's a small enough issue the team might agree to take it on as part of the current sprint. If not the issue can be left to be considered as part of the triage and sprint planning process.
* If there isn't consensus with the team on the best approach for a refactor, the options might be considered in a KDD style process.

## Long Term Refactoring

Some refactors involve updating code in a lot of different places.
These kinds of refactors can sometimes be done, piece by piece.
E.g. Switching out an old table component for a new more powerful one.
In this case it often makes sense to set a pattern on how to do the refactor, then plan in small chunks on how to refactor as we go.

## Todos: tech debt to refactor!

- Abstracted API hooks -> all-in-one hook
- Github Actions: check for any depreciated actions or commands and create an issue to upgrade

# Dependency upgrades

A core element of code maintenance is keeping our dependencies up to date. This ensures we are getting the latest security patches, as well as new features that can improve performance and developer experience.

Dependencies are easiest to keep up to date if we do so regularly. Falling behind several major versions often makes upgrading painful. It also tends to mean we can't update other packages, as they depend on newer versions of peer dependencies as well.

## Our practices

Patch and minor upgrades to dependencies should be applied regularly - at least every release.

For major version upgrades, a refactor issue should be created. When working on this:

- Changes in the major version should be reviewed
  - Are there breaking changes for components that we use? What is the level of impact on our codebase?
  - Are there new features that we would benefit from?
- If either of these are significant, pair with a senior/expert in the area of the code affected, to make a plan for the upgrade. See below about ring-fencing dependenices.
- The upgrade should be applied, and breaking changes handled. New features should be raised as a separate issue to be triaged, please use the refactor issue template to articulate the value of moving to the new features.


### Ring-fencing dependencies

To make upgrading packages easier, we should endeavour to `ring-fence our dependencies`. This is part of the intention of the `common` folder, but still needs to be worked towards. Let's take a simplified example:

```ts
// Package exposes:
function add(a: number, b: number) {...}

// Our common folder exposes:
function add(a: number, b: number) {
  return package.add(a, b)
}

// We use in the rest of our code
add(15, 6)
```

After a major upgrade, the package might change the API:
```ts
// Package now exposes:
function add(inputs: { first: number, second: number }) {...}
```

Because we have created our common wrapper, we can shield the rest of our codebase from having to change to support this upgrade:
```ts
// Our common method can continue to expose the same function signature:
function add(a: number, b: number) {
  return package.add({ first: a, second: b })
}
```

We might have been using `add` in hundreds of files! But now we only need to change one place.

This won't always save us from having to make sweeping changes - we might want to pass in a new type of param for example - but it does give us the option of when to do this. We can use the wrapper methods to allow upgrading dependencies quickly and access performance/security improvements, and then do a second update of the codebase to make use of new features, at a time that works for us.
