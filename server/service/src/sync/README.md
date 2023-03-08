## Versioning

Version number is set in [settings.rs](./settings.rs) and will be set in header to allow central server to check compatibility. 
Central server records max and min version it's compatible with, and a simple comparision determines compatibility (`min_version <= site_version <= max_version`).
See [Versioning KDD](../../../../decisions/version-compatibility.md) and `syncV5API_checkVersion` on central server for more details, extract:

**When to increment max_version and min_version**

When server is changed in such a way that all previous versions of client are not compatible and client needs to be updated 
to match the server. For example:

* adding a new compulsory header
* adding compulsory field to PUSH body
* changing the shape of PULL body
* adding a compulsory not null field to a table, where default value cannot be deduced
* changing authentication method

**When to increment max_version only** 

When change allows for previous version to still work without logical or syntax errors. For example:

* adding a new optional field or a field where default value can be deduced
* adding a new table
* adding new optional header


### TODO

Full description of sync mechanism, file structure, tests, etc..