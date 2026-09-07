# Security Behaviors

This folder pins **behavioral invariants** of the server that security-relevant code must always satisfy. Each behavior states the invariant, why it exists, and how agents can verify it cheaply before and after any change that touches the involved code.

Sources: these were derived from the 2026-08-26/27 pentest round + code deep-dive (see `security/audits/backend-2026-08-27/index.html` for the full adversarial review). When implementation and spec disagree, the spec wins or gets fixed — but any change to a pinned behavior must land here first, with its verification recipe updated.
