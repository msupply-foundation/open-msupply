# `src/shared/` — Java both Android shells compile

`java/` here is added to `java.srcDirs` by **both** Android projects:

- `frontend/android/app/build.gradle` — this, the new front end's shell
- `client/packages/android/app/build.gradle` — the shipping (transition) APK,
  which reaches in here rather than keeping a copy of its own

It lives in the new shell because that is the direction the code is travelling:
the transition APK goes away when the old front end does, and nothing here
should have to move again when it does.

It exists because the discovery host contract
(`frontend/src/discovery/hostContract.ts`) is only worth anything if there is
**one** implementation per platform. Two copies of `DiscoveryHostPlugin` would
be exactly the drift the contract was written to make impossible — the old
codebase had two different "is this server on this machine?" rules for that
reason.

Both projects declare `package org.openmsupply.client` and each has its own
`MainActivity`, so `src/main/java` as a whole cannot be shared: a file here
must not reference anything project-specific. Where the plugin needs something
from its host activity it asks through `DiscoveryHostActivity`, which each
project's `MainActivity` implements.

Everything the new front end needs is here, because it needs it from BOTH
bundles — the plugins it calls have to exist in the transition APK as well as
this one.

Two files stay out:

- `MainActivity` — each project has its own, same fully qualified name. That
  is the reason `src/main/java` as a whole cannot be the shared root.
- `RemoteServer` — the two have genuinely drifted rather than merely diverged
  in comments: this shell treats the JNI library as optional (the dev loop
  bundles no `.so`), the transition APK hard-loads it. Reconciling them is a
  behaviour change, not a rename, so it is its own piece of work.
