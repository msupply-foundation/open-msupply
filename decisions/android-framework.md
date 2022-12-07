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
- Extra time to set up dev environment
- It looks like we can only serve a bundled app (although it can be served from url, url needs to be know at compile time), this affects requirement number `6`

### Option 2 - Barebone native app with WebView

Capacitor also uses WebView, but it's only pre-configured for `3`.

We can achieve the same with a barebone mobile app and a WebView.

*Pros:*
- Full and direct control over native code
- Can serve bundled from external server addresses requirement `6`

*Cons:*
- Have to implement features that are already available in Capacitor (addresses `3` and `1`)

### Option 3 - Desktop client and Web client as one app

No frameworks available for this yet, possibly Tauri (issue from september 2022 says they have mobile alpha in next few weeks).

## Extra

Requirement `2` hasn't been mentioned in both options, since I think it's independent of the options, we can point both options to use bundles served on dev computer for hot reload and debugging and both options use Android Studio for native code debugging.

## Decision

I suggest going with Option 2, since I like direct control over native code and any of the plugins that are available in Capacitor are open source and can be ported to barebone app. I have a small concern that a framework may help us get going quicker but maybe harder to modify certain niche functionality.
Also I think it would be a big ask to upgrade all clients when server upgrades.