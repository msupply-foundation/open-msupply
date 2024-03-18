# File Sync

- _Date_: 2024-03-18
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

Most of these proposed solutions require a store to be setup on the Legacy Server which it in turn sync's with the legacy server (at least for now).
Avoiding this or creating a dedicated admin store might be a good approach to manage this?

## Options

### Option 1 - Single Code base for Central Server and Remote

_Pros:_

- Already implemented
- No need to maintain two code bases
- Would allow a fully standalone server/client setup
- Able to use rust to check types match between server and client

_Cons:_

- Could be more spaghetti code as you need to have if statements or barriers that check if running as central server
- Binary & assets might be larger than necessary as both central and remote functions need to be included

- No site specific sync buffers (although could be added) which makes things a little more

### Option 2 - Separate Binary but shared sync code & repository layer

We could build a different central server binary, it could share some library level code with the remotes server.

_Pros:_

- Having a separate binary does allow it to be dedicated to the central server tasks (remote server graphql could be excluded for example)
- By sharing code code compatibility is more likely to be maintained (at least for syncing for the same version)
- Probably easier to avoid `Am I a central server` checks but some may well make it into that shared code base.

_Cons:_

- Another binary needs to be maintained (Could be kept fairly light)

> Note: Many of the same benefits could be achieved with a feature flag?

### Option 3 - Completely separate code base

A dedicated central server code base could be thinner and more focussed on the central server goals.
Where it makes sense we could adjust the repository layer to only store what's needed for sync to work well.
E.g. Maybe we could store asset logs and assets in the same table, or maybe we can shard data across different databases for different sites?

_Pros:_

- No need for "Am I a central server or not" code
- Could be postgres only and avoid the need for handling non-postgres databases
- Would allow more flexibility in how we store data for sync
- Might be easier to setup a central server in proxy mode, handling all sync requests for an installation, forwarding on only those that are needed to the legacy server
- UI could also be completely separate, which would allow us to create an interface that's more focussed on the central server tasks, and make it fast to load when used remotely?

_Cons:_

- We'd probably need to be a lot of copy and pasting of very similar code (e.g. Every new table would need to be added in two code bases)
- Bigger initial code/development cost
- No ability to use rust to check types match between server and client, latest version compatibly would be almost guaranteed (although this could be a bit misleading if clients are on a different version of the code base anyway)

## Decision

Option 1 - Single Code base for Central Server and Remote

## Consequences

This makes
