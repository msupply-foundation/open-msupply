+++
title = "Sync API"
description = "Sync API"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 51
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

## Authentication

Authenticate with central server.

<!-- TODO: split into table for request and response, and add example for both -->

|          |                 |
|--------- |-----------------|
| method   | `POST`          |
| headers  | `Authorization` |
| endpoint | `sync/v5/auth`  |
| response | `200 OK` + JWT  |

Username and password credentials are entered and used to authorise against the central server.

<!-- TODO: specify auth protocol, basic or digest -->
<!-- TODO: add details on authentication, when is it needed, when is it done, how frequently, etc. -->
<!-- TODO: add JWT details, token fields, how is it signed, when does it expire, etc. -->
<!-- TODO: specify response details, JWT in body or `Set-Cookie` header etc. -->
<!-- TODO: add any fail responses -->

<!--

## Get the users of a store

|          |                      |
|----------|----------------------|
| method   | `GET`                |
| headers  | `Authorization`      |
| endpoint | `/sync/v5/user`      |
| query    | `?store`             |
| response | `200 OK`+ JSON array |

-->

<!-- TODO: is this sync-specific? -->
<!-- TODO: specify auth header value, JWT or username:password -->
<!-- TODO: add any fail responses -->

## "Pulling" updates

"Pull" sync updates from the central server.

As with previous versions of mSupply sync, the central server maintains and exposes a queue containing sync out records.

As of mSupply sync v5, changes to system data are no longer added to the sync out queue, and are instead recorded as entries
in a centrally managed change log. The change log is exposed as a read-only data structure to consumers, who are responsible
for maintaining their own cursor.

### Consuming the sync queue

<!-- TODO: split into table for request and response, and add example for both -->

|          |                                             |
|----------|---------------------------------------------|
| method   | `GET`                                       |
| headers  | `Authorization`                             |
| endpoint | `/sync/v5/queued_records`                   |
| query    | `?limit`                                    |
| response | `200 OK` + JSON array of `sync_out` records |


<!-- TODO: specify how JWT is encoded -->
<!-- TODO: specify auth header value, JWT or username:password -->
<!-- TODO: add any fail responses -->

<!-- TODO: add explanation of sync queue synchronisation -->

### Consuming the change log

<!-- TODO: split into table for request and response, and add example for both -->

|          |                                               |
|----------|-----------------------------------------------|
| method   | `GET`                                         |
| headers  | `Authorization`                               |
| endpoint | `/sync/v5/central_records`                    |
| query    | `?cursor&limit`                               |
| response | `200 OK` + JSON array of `change_log` objects |

<!-- TODO: specify auth header value, JWT or username:password -->
<!-- TODO: add any fail responses -->

When reading from the change log, the `cursor` is the `sequence` of the last retrieved record, and `limit` is number of
requested objects to read.

<!-- TODO: specify if limit is inclusive, e.g. response starts at sequence=cursor or sequence=++cursor -->

Each change log object matches the following schema:


```JS
{
  "type": "object",
  "properties": {
    "site_id": {
	  "description": "The ID of the remote site",
	  "type": "string"
    },
	"table": {
	  "description": "The table of the updated record",
	  "type": "string"
	},
	"recordID": {
	  "description": "The UUID of the updated record",
	  "type": "string"
	},
	"action": {
	  "description": "The operation performed on the updated record",
	  "type": { "enum": ["insert", "delete", "update"] }
    },
	"sequence": {
	  "description": "A unique sequence number for this log",
	  "type": "string",
	},
	"data": {
  	  "description": "The changes made to the updated record, represented as key/value pairs",
	  "type": object
	}
  },
  "required": ["site_id", "sequence", "data"]
}
```

For example:

```JS
{
  "site_id": "1",
  "table": "trans_line",
  "recordID": "a1b2c3d4-e5f6-...",
  "action: "insert",
  "sequence": "123456",
  "data": {
    "item_name": "amoxymoxylyn",
	"quantity": 123,
	"cost_price": 123.45
  }
}
```

Binary data (e.g. blobs, pictures etc.) are `base64` encoded. Object fields (i.e. `JSONB`) are serialized in normal fashion.

In the instance where the change log is missing records, the server will return a minimal "placeholder" object consisting
only of the required fields, with `{ "data": "none" }`.`

<!-- TODO: add explanation of change log synchronisation -->

## Acknowledgement

<!-- TODO: split into table for request and response, and add example for both -->

|              |                              |
|--------------|------------------------------|
| method       | `POST`                       |
| headers      | `Authorization`              |
| endpoint     | `sync/v5/acknowledge_records`|
| body         | JSON array of record IDs     |
| response     | `200 OK`                     |

<!-- TODO: specify auth header value, JWT or username:password -->
<!-- TODO: add query details -->
<!-- TODO: add any fail responses -->

Acknowledge records which have been successfully synchronised.

This endpoint is used by the remote server to notify the central server of successful synchronisation and integration of records. On notification, the central server can then safely delete the integrated records from the sync queue.

The central server sync queue is designed for eventual consistency, meaning that there is no guarantee that the sync queue will not contain already integrated records. Acknowledgement requests will not be retried in situations where the central server does not respond; it is the responsibility of the remote server to handle instances where `queued_records` response contains previously integrated records.

Note that acknowledgment is uni-directional and acknowledgement requests are only made from remote servers to the central server. The central server will never send acknowledgement requests to remote servers.

## "Pushing" updates

<!-- TODO: split into table for request and response, and add example for both -->

|          |                                  |
|----------|----------------------------------|
| method   | `POST`                           |
| headers  | `Authorization`                  |
| endpoint | `/sync/v5/queued_records`        |
| body     | JSON array of `sync_out` records |
| response | `200 OK`                         |

<!-- TODO: specify auth header value, JWT or username:password -->
<!-- TODO: add any fail responses -->

"Push" records from the remote site to the central server.

If the server returns `200 OK`, the remote site deletes the pushed `sync_out` records from its queue.

<!-- TODO: add examples -->
