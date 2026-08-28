# 👩🏻‍💻 What does this PR do?

Fixes #

## High level Description

<!-- Explain the changes you made and importantly why -->
<!-- AI AGENTS should NEVER fill in this section. High level description should always be written by a human -->

## Screenshots

<!-- Mandatory for all PRs introducing new UI, including new components, and new functionality -->
<!-- Include all expected breakpoints if relevant e.g. How does it look on tablet, vs desktop? -->

<!-- Please include links to videos/demos of new functionality if possible -->

## 💌 Any notes for the reviewer?

<!--
Do you have any specific questions for the reviewer?
Is there a high risk/complicated change they should focus on?
Any general areas of the codebase touched? any side effects caused?
Anything half cooked but going to be finished off in a different PR?
-->

## Detailed Description

<!-- More detailed description if required, this is where AI AGENTS should add a more detailed description of changes -->

# 🧪 Testing

## 🛠️ Testing Setup Steps/Dependencies

<!-- Document any setup steps or configuration that are required to correctly test this -->

- _(e.g.)_ This bug only triggered when Skip Status on Inbound Shipments excluded Picked
- _(e.g.)_ Requires a remote site running a non-sync v7 version such as 2.21.0 as well as a SEPARATE remote site running this PR.

## 🤖 Automated Testing

<!-- What did you do to verify this works? -->

- _(e.g.)_ Added unit tests covering the issued-quantity calculation in the requisition service
- _(e.g.)_ AI Driven exploratory testing was run over the Requisitions and Inbound Shipments, including checking for ledger discrepancies
- _(e.g.)_ Used playwright to verify that the new field is visible at all appropriate screen sizes

## 🧑‍🔬 Human Testing Completed

<!-- What did you do to verify this works? -->
<!-- AI AGENTS should NEVER fill in this section. A human should always document their own testing steps. -->

- _(e.g.)_ Set up a Central Sync server with 1 Legacy Desktop remote site and 1 OMS remote site running this PR (sample datafile: _google drive link_)
- _(e.g.)_ Opened a requisition, added some lines, and made a couple of invoices supplying some of those lines
- _(e.g.)_ Confirmed the "Issued" column showed the sum of the amounts already issued in invoices for the requisition

## ❓ Testing Requests / known testing gaps

<!-- If applicable -->

- _(e.g.)_ I didn't test sync to older versions of open-mSupply, would be good if we QA could run a backwards compatibility check
- _(e.g.)_ I didn't test on android, as I don't expect it to be impacted by this change

# 📃 Documentation

<!--
Pick what applies. If docs are needed, add the matching label (`docs: external` / `docs: internal`)
and change it to `doc: done` once written. See docs/content/process/documentation for the full process.
-->

- [ ] **No documentation required** — no user-facing change (e.g. a refactor, or a bug fix that doesn't change behaviour)
- [ ] **Part of an epic** — documentation will be completed for the feature as a whole
- [ ] **Public docs needed** (`docs: external`) — user-facing / UI change, written up in the [msupply_docs](https://github.com/msupply-foundation/msupply_docs) repo. Note what changed / how it works (bullets or screenshots):
<!-- - _(e.g.)_ New `issued` column in `Requisitions` indicates stock quantity already in shipments -->
- [ ] **Developer docs needed** (`docs: internal`) — code or process worth documenting in `./docs`:
<!-- - -->
