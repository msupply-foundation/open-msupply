+++
title = "Nightly Automated Builds"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Nightly Automated Builds

This GitHub Action automatically generates new tags in the repository to trigger our build pipeline and send Telegram notifications to relevant channels. The primary goal is to generate fresh builds automatically for QA and internal testing without manual intervention.

---

## Current Workflow

### 1️⃣ Tag Creation & Telegram Notification

- Runs daily at 6:30 PM NZST (7:30 PM NZDT) to align with UTC schedules.
- Generates a new tag automatically and pushes it to GitHub.
- Sends a Telegram message to the Open-mSupply build channels immediately after the tag is created, notifying the team that a new build cycle has started.

---

### 2️⃣ Triggering Builds on Tag Detection (WIP)

Once a tag is created:

- The CI/CD pipeline will detect the new tag automatically.
- Builds release artifacts in Jenkins and Android pipelines based on the tagged commit.
- Uploads built artifacts to our cloud storage for easy access by QA and testers.
- Sends a Telegram message upon successful build and upload.
