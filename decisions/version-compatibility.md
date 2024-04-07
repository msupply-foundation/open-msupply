# Versions and Compatibility

- *Date*: 2023-01-08
- *Deciders*: Mark Prins, Andrei Evguenov, Clemens
- *Status*: DECIDED
- *Outcome*: Option 4 - Separate sync version and server knows which previous version it is compatible with

## Context

API changes may result in version compatibility issues between apps in omSupply/mSupply ecosystem. A strategy to `know` what versions are compatible with each other is good to have and implement early on.
So far we have the following independent apps to think about in this space:
* Remote Server <-> Central Server (sync api)
* Remote Server <-> omSupply Client (discovery API and potentially omSupply client specific api)

I will focus on Remote Server <-> Central Server for the rest of the document, same concept should apply uniformly

###  Examples of breaking compatibility changes

1. New sync field is added to a table on remote server, it doesn't exist on central server, causing errors during sync `push` (1.02 <-> 5.06 example in table below)
2. Sync api shape has changed on central server causing errors during `pull` (1.01 <-> 5.08 example in table below)

### Example compatibility matrix:

|            |      | CENTRAL        |                |                |                |                |
|------------|------|----------------|----------------|----------------|----------------|----------------|
|            |      |      5.06      |      5.07      |      5.08      |        6       |       7.1      |
| **REMOTE** | 1.01 | **compatible** | **compatible** | not compatible | not compatible | not compatible |
|            | 1.02 | not compatible | **compatible** | **compatible** | **compatible** | not compatible |
|            | 1.06 | not compatible | not compatible | **compatible** | **compatible** | not compatible |
|            | 1.07 | not compatible | not compatible | **compatible** | **compatible** | not compatible |
|            |   2  | not compatible | not compatible | not compatible | **compatible** | **compatible** |


### Example of awareness which REMOTE version know about which CENTRAL version

|            |      | CENTRAL   |              |              |              |              |
|------------|------|-----------|--------------|--------------|--------------|--------------|
|            |      |    5.06   |     5.07     |     5.08     |       6      |      7.1     |
| **REMOTE** | 1.01 | **knows** | doesn't know | doesn't know | doesn't know | doesn't know |
|            | 1.02 | **knows** |   **knows**  | doesn't know | doesn't know | doesn't know |
|            | 1.06 | **knows** |   **knows**  |   **knows**  | doesn't know | doesn't know |
|            | 1.07 | **knows** |   **knows**  |   **knows**  |   **knows**  | doesn't know |
|            |   2  | **knows** |   **knows**  |   **knows**  |   **knows**  |   **knows**  |


### Example of awareness which CENTRAL version know about which REMOTE version

|            |      | CENTRAL      |              |              |              |           |
|------------|------|--------------|--------------|--------------|--------------|-----------|
|            |      |     5.06     |     5.07     |     5.08     |       6      |    7.1    |
| **REMOTE** | 1.01 |   **knows**  |   **knows**  |   **knows**  |   **knows**  | **knows** |
|            | 1.02 | doesn't know |   **knows**  |   **knows**  |   **knows**  | **knows** |
|            | 1.06 | doesn't know | doesn't know |   **knows**  |   **knows**  | **knows** |
|            | 1.07 | doesn't know | doesn't know | doesn't know |   **knows**  | **knows** |
|            |   2  | doesn't know | doesn't know | doesn't know | doesn't know | **knows** |


## Options

### Option 1 - Central server to dictate compatibility

An api call before sync or header check in sync to check which remote version central server supports. A hard coded version number on Central server would list from version and to version of remote that it supports.

*Pros:*
- Simpler implementation

*Cons:*
- Since central server is only aware of current versions of remote, if remote is updated without breaking changes to compatibility, it would still fail compatibility test

To elaborate on the above, taking intersection of awareness of remote on central with compatibility we get:

|            |      | CENTRAL        |                |                                   |                                   |                |
|------------|------|----------------|----------------|-----------------------------------|-----------------------------------|----------------|
|            |      | 5.06           | 5.07           | 5.08                              | 6                                 | 7.1            |
| **REMOTE** | 1.01 | **compatible** | **compatible** | not compatible                    | not compatible                    | not compatible |
|            | 1.02 | not compatible | **compatible** | **compatible**                    | **compatible**                    | not compatible |
|            | 1.06 | not compatible | not compatible | **compatible**                    | **compatible**                    | not compatible |
|            | 1.07 | not compatible | not compatible | ~~**compatible**~~ not compatible | **compatible**                    | not compatible |
|            | 2    | not compatible | not compatible | not compatible                    | ~~**compatible**~~ not compatible | **compatible** |



### Option 2 - Api versioning

Every time compatibility changes, API version is increased (keeping existing API version for backwards compatibility)

So in `Example 1.` -> New field is added to central and completely new API version is added 
In `Example 2`. -> Whole new API version is added with new logic keeping existing logic if possible, and keeping existing API

*Pros:*
- Allows for backwards compatibility

*Cons:*
- Could result in quite a bit of overhead and a lot of use cases to consider for backwards compatibility when `core` changes are made
- Could result in different variations of end point versions and a bit of duplication to keep track of

### Option 3 - Two way compatibility check

Both central and remote keep track of `from` version of compatibility, and during sync these are exchanged and checked (either on remote or central, prefer remote to reduce logic slightly on central).

For `Example 1.`, when a new field is added on remote, we add it to central, and change `from version of central` on remote to this newer version of central. (previous version of remote will still be supported)

For `Example 2.`, when api shape changes on central we update remote to use new api, and keep existing api support on remote, in this case `from version of remote` will now be updated to match new `remote` version (this new remote version will still be backwards compatible with older central versions)

*An example:*
* 1.01 remote is compatible with `>=` 5.06 central
* 1.02 remote is compatible with `>=` 5.07 central
* 1.06 remote is compatible with `>=` 5.08 central
* 1.07 remote is compatible with `>=` 5.08 central (this is carried over from 1.06 version of remote).
* 2 remote is compatible with `>=` 6 of central
* 5.08 central is compatible with `>=` 1.02 of remote
* 6 central is compatible with `>=` 1.02 of remote  (this is carried over from 5.08 version of central).
* 7.01 central is compatible with `>=` 2 of remote

*when remote and central both agree about compatibility*

So let's say 1.07 is trying to sync with 5.08, central says it's compatible with 1.02 and up and 1.07 knows it's compatible with 5.08 and up, thus it's ok to sync.

*central agrees with compatibility but remote disagrees*

2 is trying to sync with 5.08, central says it's compatible with 1.02 and up and remote knows it's compatible with 6 and up, sync is not allowed.

*remote agrees with compatibility but central disagrees*

1.02 is trying to sync with 7.01, remote knows it's compatible with 5.07 and up, but central says it's only compatible with 2 and up, sync is not allowed

*Pros:*
- Simpler then `Option 2` and slightly more involved then `Option 1`, but seems (subjectively) the best balance for compatibility/complexity
- Quite flexible in forward and backwards compatibility

*Cons:*
- More involved, and flexibility can be a double edged sword

### Option 4 - Server knows which previous version it was compatible with and use independent version for sync

This option originated from a conversation with Chris about this KDD after it was merged.

This is similar to Option 3, but it would be more generic (server doesn't need to know about consumer version just the version of API they are compatible with). 

Basically the server knows which API version it is on and which API version it is backwards compatible with, and the consumer states which API version it uses.

Compatibility matrix would look like this (same compatibility matrix but now with API version):

|            |                 | CENTRAL                            |                                    |                                    |                                    |                                    |
|------------|-----------------|------------------------------------|------------------------------------|------------------------------------|------------------------------------|------------------------------------|
|            |                 | 5.06                               | 5.07                               | 5.08                               | 6                                  | 7.1                                |
|            |                 | (backward compatible from API-3.0) | (backward compatible from API-3.0) | (backward compatible from API-3.1) | (backward compatible from API-3.1) | (backward compatible from API-3.3) |
|            |                 | (API-3.0)                          | (API-3.1)                          | (API-3.2)                          | (API-3.3)                          | (API-3.4)                          |
| **REMOTE** | 1.01 (API-3.0)  | **compatible**                     | **compatible**                     | not compatible                     | not compatible                     | not compatible                     |
|            | 1.02 (API-3.1)  | not compatible                     | **compatible**                     | **compatible**                     | **compatible**                     | not compatible                     |
|            | 1.06 (API-3.2)  | not compatible                     | not compatible                     | **compatible**                     | **compatible**                     | not compatible                     |
|            | 1.07 (API-3.2)  | not compatible                     | not compatible                     | **compatible**                     | **compatible**                     | not compatible                     |
|            | 2 (API-3.3)     | not compatible                     | not compatible                     | not compatible                     | **compatible**                     | **compatible**                     |

It seems that compatibility formula for this example is pretty self explanatory:

compatible =  client API version >= backward compatible from AND client API version <= current API version.

*Pros:*
- Simpler than `Option 3` and arguable simpler than `Option 1`, this seems the simplest and the most direct way to achieve the requirement

*Cons:*
- Have to maintain another version for sync (arguable could also be a pro, simplifies sync versioning by making it more direct and decoupled form main app version)

## Decision

I suggest to go with `Option 4`, seems simple and direct way to meet the requirements.

## Consequences

### For sync

We already use `major` versioning with separate routes, omSupply is currently using v5. We can still introduce backwards incompatible change on central server (like tweaking the shape of API), in this case instead of re-defining the route we should just increment the minor (even though technically it shouldn't be a breaking change according to semantic versioning).

Some realistic examples of `Option 4`:

#### Example V5.0.2

1.2.0 remote server uses V5.0.1 API.

7.0.0 central server is on V5.0.1 API and is backwards compatible with V5.0.0 and up.

New field is added to om_action_log, this field needs to sync with central.

1.2.1 remote server now requires new API version V5.0.2

In 7.0.1 this field is added and API version is incremented to V5.0.2, it is still backwards compatible with V5.0.0 (since we decided that 1.2.1 does migration on om_action_log table to add default for that field and also during sync in 1.2.1 if that field is missing a default is added)

When we try to sync 1.2.1 remote server with 7.0.0 central server, central server sees that it doesn't support 1.2.1 and sync is prohibited

#### Example V5.1.0

1.2.1 remote server uses API version V5.0.2

7.0.1 central server is on V5.0.2 API and is backwards compatible with V5.0.0 and up.

The shape of API request was changed, new required field in `push` was added (this field is critical for future sync and is required now).

In 1.2.2 we've added this field and now it uses V5.1.0 API

7.0.2 central uses this field and it's now on V5.1.0 API with minimum backwards compatible version of V5.1.0 API

### For other

Option 4 of compatibility should apply to other areas:

#### Native Client

The remote server knows its current version and the versions it is compatible with. 
The server sends this list of versions to the client and the client decide if it can work with the remote server.


