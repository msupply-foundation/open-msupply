# Central Server UI

- _Date_: 2024-04-12
- _Deciders_: James Brunskill, Roxy Dao, Mark Prins
- _Status_: DECIDED
- _Outcome_: Option 4

## Context

There have been concerns raised about the UI of the new open mSupply central server, mostly that the UI is the same as the remote server UI.

A central server is initialised with a store, as per the remote site. All of the actions available on a remote site are available on central also, which could lead to confusion.

### General questions:
* Should the UI display somewhere that it is a 'central server'?
* Should the theme appear different?
* Should all of the same menu functions be available?

### Follow-up questions
Depending on the answers above, the follow up questions are:

* Which menu options / functions should be available on central?
* How obvious should it be that you are on a central server?

## Options

### Option 1 - Display 'Central Server' in the UI

Display 'Central Server' in the UI, in the header or footer, to make it clear that the user is on a central server.
Not in the screenshot, but suggested later: Add a 'central' indication or icon next to the mSupply guy icon, top left.

An example:

![Option 1](./media/central-server_option_1.png)


_Pros:_

- Simple to implement

_Cons:_

- Can be missed by users
- The standard store functions are available and these aren't all appropriate on central

### Option 2 - Simplify menu options

In addition to showing a banner in the header or footer, remove some of the menu options that are not appropriate for a central server.
An example:

![Option 2](./media/central-server_option_2.png)


_Pros:_

- Fairly simple to implement
- Reduces potential confusion for users
- Is more obvious that this is not a standard server

_Cons:_

- Requires greater maintenance overhead

### Option 3 - Display relates to user mode and not server type

The theme layout should not be based on whether it's the central server or not, but rather on the mode you're operating in - as a regular Store user, or as a national administrator / manager (and the latter happens to only be possible on the central server)

This doesn't preclude showing 'central server' somewhere though. We don't currently have different user roles, so this option would have to wait.

_Pros:_

- Much clearer what the user is able to do
- Quick indication of which mode you are logged in as / operating as

_Cons:_

- Not possible with current user implementation

### Option 4 - Mode requires a different login path / process / switch on login

We could login to a different url path such as `/admin/`.
We could still have a switch to central server mode, that could even work from remote sites, it would just connect to their central server URL on `/admin/`

All the central actions are only available in this mode - they are removed from a remote site.

We should also allow permissions that are central server permissions and aren't linked to a store. Right now it's very confusing that you can be on central server, but logged into the wrong store, and not be able to do central server admin functions (like editing items for example)

Remove store name - if you are editing central data then you aren't logged into a specific store.
Have a completely different theme for the central server mode.
Only the central actions are available in this mode.


_Pros:_

- Clear that you are on a central server and operating on central data
- Can limit access to users / roles
- Clear that open mSupply handles central data
- Removes the 'store active on site' confusion and isolates global actions
- Requires a different login path / process : prevents accidental access

_Cons:_

- More complex to implement
- Requires a different login path / process : more difficult to access
- Would potentially require some navigation / menu redesign



## Decision

We will implement option 4, with an interim implementation of Option 1.

## Consequences

There's a bit of rework as this is a significant change to the UI. Further analysis and UI design needs to happen prior to implementation. 
