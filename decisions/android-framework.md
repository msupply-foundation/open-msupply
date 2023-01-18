# Android Framework

- *Date*: 2022-12-7
- *Deciders*: 
- *Status*: 
- *Outcome*: 

## Context

Cross platform application with single code base has been our goal from the start. omSupply UI is in js/html and backend is in rust, we concluded that we can compile rust server to native code and use js/html bundle as UI element in Android application.

There are multiple tools and ways to display js/html in Android app, this KDD should help us decide.

## Requirements

`NOTE` our target is a mobile tablet, not targeting phones at this stage. 

1. Access native functionality
2. Run application in debug mode
3. Native "feel" (deal with constraints of mobile environment, like virtual keyboard, screen size, etc..)
4. Can act as a server (discoverable by other mobile/desktop sites)
5. Can act as a client (can connect to other mobile/desktop sites)
6. Minimise the need to upgrade when server upgrades

## Options

### Option 1 - Capacitor

Cross platform native runtime for web apps. Very popular with extendable plugin system and a lot of plugins available.

*Pros:*
- We get a lot for free out of the box

*Cons:*
- Harder to control internals if they need to be modified
- Extra tools to learn
- In order to achieve 6. need a few work arounds

### Option 2 - Barebone native app with WebView

Capacitor also uses WebView, but it's already pre-configured for `3`.

We can achieve the same with a barebone mobile app and a WebView.

*Pros:*
- Full and direct control over native code

*Cons:*
- Have to implement features that are already available in Capacitor (addresses `3` and `1`)
- Porting plugins that are available in Capacitor is not trivial

### Option 3 - Desktop client and Web client as one app

No frameworks available for this yet, possibly Tauri (issue from september 2022 says they have mobile alpha in next few weeks).

## Extra

Requirement `2` hasn't been mentioned in both options, since I think it's independent of the options, we can point both options to use bundles served on dev computer for hot reload and debugging and both options use Android Studio for native code debugging.

## Decision

Original suggestion was to go with `Option 2`, but after some research we realised that being able to serve bundle from arbitrary server was possible with Capacitor (although it's a bi hacky), and trying to port a plugin to Native barebone application was quite difficult. Would now suggest `Option 1`, the cons can be mitigated by better explanation of what Capacitor is and how we use it. Also the `cons` of `Option 2` can lead to quite a lot of extra work

Lastly would suggest keeping an eye on Option 3 and re-writing this KDD when Option 3 becomes feasible (tauri mobile available and stable)