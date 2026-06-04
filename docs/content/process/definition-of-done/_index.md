+++
title = "Definition of Done"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Definition of Done

> This is a living document, first experimented with by Team Ruru for 2.8 release, updated as of 2.10

As a team, it's important we have an agreed understanding of what it means for a piece of work to be considered "done". It defines the level of quality we commit to, and what others can expect from our software once we say something is done.

## Definition

For us, "development done" of an issue means:

- Issue acceptance criteria have been met
- All tests, including integration test, pass
- All added logic has associated unit tests
- GraphQL nodes added to an API contract test (types based - ensure stability of GQL API for 3rd party consumers)
- No known bugs in the new area
- Refactoring has been completed where code duplication would have been created - endeavour to introduce as little technical debt as possible
- Any unhandled cases are apparent to user and in code (either due to out-of-scope or in-development)
- Bullet points of the changed areas have been added to the Draft Docs Google Doc (to be written into the external docs by RC phase)
- Internal documentation written for any patterns added (where sensible, may be comments, README, KDD...)
- If internal docs are missing for existing pattern, context, command etc.
  - At minimum, add a TLDR in relevant place
  - If needed, create an issue for further context to be added by area expert
- Testing steps have been written with PR reviewer and QA in mind, and I have gone through these steps myself
- PR approved and merged


And for "done" of a feature:

- External docs fully written (user friendly language, screenshots, and deployed to staging)

## Outcomes

We expect the focus on the below practices to result in:

- Increased confidence in the code released
- Fewer bugs found during RC phase
- Fewer regression bugs over time (due to being caught by tests)
- Greater understanding for PMs/QA of feature implementation and its current state, due to draft documentation (& regular demos)
  - Any misunderstandings/required rework is caught earlier


Practices to help:

- Treat `develop` branch as deployable - we should be confident that everything we merge there works
- Test-driven development - write the tests first
  - Proves that any code added is required, in order for a piece of logic to succeed
  - Ensures we write testable code
- Separate logic methods and their consumers, so tests are easier to write (e.g. a lot easier to test outputs of a function, than test a React component renders in various different ways!)


## AI-assisted work

A meaningful share of the code we ship is now drafted with AI assistance. The bar for "development done" doesn't change because of this, but a few of the existing items take a bit more care:

- **All added logic has associated unit tests** — AI-drafted tests need a deliberate read to confirm they test the *spec*, not just the implementation as written (see [Unit Testing & Mocking](@/patterns/unit-testing/_index.md))
- **No known bugs in the new area** — AI may quietly extend scope or change behaviour at edges the prompt didn't cover; widen your own testing past the happy path before calling it done
- **Refactoring has been completed where code duplication would have been created** — the cost of mechanical refactors has dropped, so the bar for what to clean up inline (vs. leaving as tech debt) is lower than it used to be (see [Refactoring](@/process/refactoring/_index.md))
- **PR approved and merged** — mention AI involvement in the PR description so reviewers can calibrate (see [Reviewing AI-assisted code](@/code-review/_index.md#reviewing-ai-assisted-code))

## Ongoing discussion

This understanding should be wider than the development team. The flow of value is only really complete when it is in front of a user. As such, we might only consider something done after a deployment of that feature has been rolled out.

However, there can be a long time between the release of a version, and its deployment in country, so in our context, it might feel more correct for "done" to equate to "released", and deployable at any time.

As such, things that should be included in done:

- Feature is QA'd
- Product documentation written (devs do reference docs, but a PM is better placed to do more of the why, the user guide)
- New/updated translations completed across our supported languages
- Feature released

We'd love to see earlier QA (e.g. nightly builds, QA testing latest changes, rather than full features during RC phase) and PMs writing preliminary docs before/during development, describing intended workflow.

These aren't within our control as a dev team though, but things to work towards as an org.

Also - "treating develop as deployable" would take the full dev team agreement, and a decision on how we handle in-progress features. Feature flags, hidden pages etc. We can revisit this in future :)
