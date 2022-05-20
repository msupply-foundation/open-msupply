+++
title = "Change Log"
description = "Change Log"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 54
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

## Key concepts

The change log is a new concept introduced in mSupply sync v5 to address problems with using the sync queue for central data changes.

Most central data changes need to be synchronised to all remote sites, meaning that an edit to a single central data record can result in `sync_out` records being created for each site in the system. This is futher compounded by remote sites failing to connect, leading to the sync queue becoming clogged with large numbers of stale records.

The change log is designed as a scalable alternative to the sync queue for synchronising central data.

<!-- TODO: change log details -->

## Processing the change log

* The following psuedo-code describes the algorithm for pulling from the central server change log:

```
Repeat while not up-to-date:
  Request records
  Integrate records (upsert)
```

<!-- TODO: what is change log record fails to integrate -->
