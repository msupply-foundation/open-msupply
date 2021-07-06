## Auth

WIP feature to replace BASIC auth

|  |   |
|---|---|
| method | POST |
| headers | auth headers  |
| endpoint | sync/v5/auth |
| response | 200 + JWT |

Each site is given a user name and password.

## Acknowledge receipt of records

|  |   |
|---|---|
| method | POST |
| headers | BASIC auth  |
| endpoint | sync/v5/acknowledge_records |
| query | ?  |
| body | JSON array of record IDs that were successfully received (so can be deleted from the sync_out queue |
| server response | 200 (non-critical- if no response is received, the records may be sent again, which should not cause problems) |

This is not bi-directional- as it's a POST, only remote server can acknowledge successful receipt after record integration. 

## Get records from the central server's queue
|  |   |
|---|---|
| method | GET |
| headers | BASIC auth  |
| endpoint | /sync/v5/queued_records |
| query | ?limit=10  |
| response | JSON array of records.  |

## Get records from the central server's change_log
|  |   |
|---|---|
| method | GET |
| headers | BASIC auth  |
| endpoint | /sync/v5/central_records |
| query | ?cursor=978987&limit=10  |
| response | JSON array of records.  |

`cursor` is the last retrieved record, so in this case the server will return sequences 978988 to 978997
Gaps in the sequence: the server will return an object with the missing sequence and a key/value `"data":"none"`
## record format
```JS
[
  {
    "site_id": "63",
    "table": "trans_line",
    "recordID": "someUUID",
    "action": "insert",  //allowed values: insert, delete, update
    "sequence": "978987",
    "data": {"item_name": "amoxygluemab", "quantity": 95555, "cost_price": 65.5}
  },
  {...another record}
]
```
Blobs, pictures etc. are BASE64 encoded.
JSONb / object fields are serialized in normal fashion.

## Get the users of a store

|  |   |
|---|---|
| method | GET |
| headers | BASIC auth  |
| endpoint | /sync/v5/user |
| query | ?store=someUUID  |
| response | JSON array of records.  |


## Send queued records

|  |   |
|---|---|
| method | POST |
| headers | BASIC auth  |
| endpoint | /sync/v5/queued_records |
| query | ? |
| body | array of records (as above)  |
| response | 200 or barf  |

Only used by remote site. 

If the server sends back 200, it has the records and remote site can delete the sync_out records from the queue 

