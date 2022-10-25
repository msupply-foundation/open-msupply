# Versions and Compatibility

- *Date*: 2022-10-19
- *Deciders*:
- *Status*: DRAFT
- *Outcome*: 

## Context

API changes may result in version compatibility issues between apps in omSupply/mSupply ecosystem. A strategy to `know` what versions are compatible with each other is good to have and implement early on.
So far we have the following independent apps to think about in this space:
* Remote Server <-> Central Server (sync api)
* Remote Server <-> omSupply Client (discovery API and potentialy omSupply client specific api)

I will focuse on Remote Server <-> Central Server for the rest of the document, same concept should apply uniformly

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

Basicallly for `Example 1.`, when new field is added on remote, we add it to central, and change `from version of central` on remote to this never version of central. (previous version of remote will still be supported)

For `Example 2.`, when api shape changes on central we update remote to use new api, and keep existing api support on remote, in this case `from verion of remote` will now be updated to match new `remote` version (this new remote version will still be backwards compatible with older central versions)

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
- Simpler then `Option 2` and slighly more invovled then `Option 1`, but seems (subjectively) the best balance for compatibility/complexity
- Quite flexible in forward and backwards compatibility

*Cons:*
- More involved, and flexibility can be a double edged sword

## Decision

I suggest to go with `Option 3`, there would need to be documentation explaining in which cases version numbers would need to be incremented, and some discussion when breaking changes on central/remote should be backward/forward compatible, but this option allows flexibility whichever way the decision goes.


## Consequences
