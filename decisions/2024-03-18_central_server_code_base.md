# Central server code base

- _Date_: 2024-04-03
- _Deciders_: Andrei Evguenov, James Brunskill, Mark Prins, Chris Petty
- _Status_: PROPOSED
- _Outcome_: Option 1

## Context

Until recently open-mSupply relied on a central server using legacy mSupply to sync data.
This meant that any new entities would require legacy server code changes to handle them.

We want to establish a transitional pattern where we have an open-mSupply Central Server but won't yet have the ability to completely replace the central server with open-mSupply.

Goals:

- Easy to develop, maintain, and test backwards compatibility
- Have something that's easy to deploy and works nicely alongside the legacy server
- New functionality can be added to omSupply central rather then adding it to legacy mSupply and having to re-write it again in omSupply in the future

Although we are committed to the existing tech stack, there are various options to consider when implementing omSupply central server. Some of the challanges we have with existing mSupply/mSupply mobile and omSupply ecosystem:
- New tables and fields need to be added in quite a few places
- Hard to keep track of compatibility between different versions of central and remote sites of various flavours
- Challenges in navigating and understand existing mSupply code base due to conditional forks in various places that differentiate functionality based on 'central' or 'remote' or 'single user' variants

## Options

### Option 1 - Single Code Base

By config it's either by a toggle set at start up or by configuration that is set on legacy central server for the site

_Pros:_

- Already implemented (can get going with this straight away)
- No need to maintain two code bases
- Would allow a fully standalone server/client setup
- Able to use rust to check types match between server and client

_Cons:_

- Could be more spaghetti code as you need to have if statements or barriers that check if running as central server
- Binary & assets might be larger than necessary as both central and remote functions need to be included

#### 1a - Differentiated by config

By config it's either by a toggle set at start up or by configuration that is set on legacy central server for the site

_Pros:_

- Easy to work with in dev (no re-compilation)

_Cons:_

- More configurations during install

#### 1b - Differentiated by feature flag

_Pros:_

- Binary should only work in one mode thus easier to install and configure

_Cons:_

- Harded to work with in dev mode (re-compilation, partialy hidden code that is only activated/compile tested when feature flag is turned on)

### Option 2 - Separate Binary but shared package/crate/library level code

We could build a different central server binary, it could share some library level code with the remotes server.

_Pros:_

- Having a separate binary does allow it to be dedicated to the central server tasks (remote server graphql could be excluded for example)
- By sharing code, compatibility is more likely to be maintained (at least for syncing for the same version)
- Reduce/removed branching logic throughout code base

_Cons:_

- In order to trully code share back and front end components, we will need to add another requirement for abstractions (re-usability, composibility), which will compete with readability and maintenability. 
- Would take quite a bit of time to set up correctly

### Option 3 - Completely separate code base

A dedicated central server code base could be thinner and more focussed on the central server goals.

_Pros:_

- Flexible and direct way to handle central server tasks, not confined by existing remote server functionality (can be postgres only)
- Better readability due to directness of the code

_Cons:_

- Usually readibility = maintenability, but in this case we would have two coded bases to maintain, which is something we've noted that we want to avoid
- API types will need extra layer to keep alligned
- UI/UX patterns or changes would need to be made in separate places, similar with bug fixes
- More to code to learn for devs

## Extra

Something we should also consider is 'transitioning' from different decisions. It would be hard to transition to and from Option 3.

Transition from Option 1 to Option 2 seems natural, it would involve abstracting common functionality to a shared package, and building a light skeleton for central server from remote server.

Transitioning from Option 2 to Option 1 is also possible, but I think would require removing some functionality that was added to support the differences of Option 2 (like storeless login)

## Decision

Recommendation is to go for Option 1 for now, to get going with central omSupply server, with commitment and consistent strive for Option 2, new issue to be created to summarise the steps required for this transition.

## Consequences


