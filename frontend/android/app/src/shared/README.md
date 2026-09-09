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

`FileTransferPlugin`, `PrintPlugin`, `ReadLogPlugin` and `RemoteServer` are
still a copy each. They are older than this arrangement and have drifted
(`RemoteServer` most of all — the new shell treats the JNI library as
optional), so moving them here is its own piece of work rather than a rename.
This directory is where they should end up.
