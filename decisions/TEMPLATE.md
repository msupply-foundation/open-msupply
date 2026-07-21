<!--
KDD (Key Decision Document) template.

Copy this file to decisions/YYYY-MM-DD_short_topic.md and fill it in.
Delete these HTML comments as you go — they are guidance, not part of the doc.

Conventions used across existing KDDs in this folder:
- File name: `YYYY-MM-DD_snake_case_topic.md` (date the decision was started/made).
- Images live in `decisions/media/` and are referenced relative to the doc,
  e.g. `![diagram](media/my_diagram.png)`.
- Keep `## Decision` and `## Consequences` even if brief — they are the point of a KDD.
- Status values seen in practice: PROPOSED / AGREED / DECIDED.
-->

# <Title — the thing being decided, in Open mSupply>

- _Date_: <YYYY-MM-DD>
- _Deciders_: <@github-handles or names>
- _Status_: <PROPOSED | AGREED | DECIDED>
- _Outcome_: <one line, e.g. "Option 2 - JSON" — fill in once decided>

## Context

<!-- Why are we making this decision now? What problem are we solving, and what
constraints/background matter? Link related KDDs where relevant. -->

### Requirements

<!-- Optional. A numbered list of what the solution must satisfy. Useful to refer
back to from the options and the decision (e.g. "handles Requirement 8 well"). -->

1. ...
2. ...

## Options

<!-- One `### Option N - <short name>` per candidate. For each, describe the
approach and its considerations (performance, sync, complexity, trade-offs).
Diagrams welcome via media/. -->

### Option 1 - <name>

<description, considerations, trade-offs>

### Option 2 - <name>

<description, considerations, trade-offs>

## Decision

<!-- Which option, and why. Reference the requirements/considerations above.
List the trade-offs you are knowingly accepting. -->

**Option N - <name>**

Rationale:

- ...

Trade-offs accepted:

- ...

## Consequences

<!-- What follows from this decision: follow-up work, risks to watch, open
questions deferred to implementation, docs/process changes needed. -->

- ...

<!-- Optional sections used by some KDDs, add as needed:
## Further consideration   — open musings not blocking the decision
## Appendix - <topic>      — supporting detail, e.g. performance testing results
-->
