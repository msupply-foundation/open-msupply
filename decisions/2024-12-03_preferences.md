# Preferences in Open mSupply

- _Date_: 2024-12-03
- _Deciders_: @Chris-Petty, @CarlosNZ, @jmbrunskill, @andreievg
- _Status_: DECIDED 
- _Outcome_: Option 1 - pref table with good type definitions

## Context

In mSupply we have numerous approaches to prefs (gory details saved for `Additional Info` below). We need a preferences system that allows:

- Global preferences, where something is broadly set (we need to decided whether this needs to / can be overridden by say store prefs, or vice versa)
- Store preferences, where something pertains to the operations of a particular store
- User preferences. An example of this is remembering custom column order or widths in table views.
- Machine preferences. Any preference that should be associated with a particular device. Prime example is choosing a default label printer for a certain machine, so that regardless of store logged in the labels print at the printer at the workstation the user is at.

### Distinction from creating new tables

It is really important to get rules down for when we should simply make a new table. Perhaps most importantly, if the entity should have relations then we want good indexing that dedicated tables provide. Beyond that, when a configuration is concrete enough, representing something correlating to the real world and likely doesn't need hierarchy or overrides then it may be appropriate to dedicate a table as it is more maintainable to have the data structure is apparent in the db schema with named, typed fields and columns (one could argue well defined structs for a preference also achieves this). Obvious candidates for distinct tables are invoices, requisitions or their lines. Master lists are a clear central configuration that benefits from RDB tables for scaling and relations. A good example of something in OG that is in preferences, but could be better in a table (particularly due to a lack of strict typing) is configured printers:

- The parameters are pretty concrete, so fields are very stable.
- We don't need any overrides.
- We (currently!) want all printers to be available regardless of what store is logged in.
- They don't need centralised control - i.e. configuration should be done on site, not on the central server.
- We should want them to sync, to include in backups and easy redeployment when reinitialising a site.

Note, there are other pref records for default printers associated with certain machines. These have a relation to some printer ID saved in the data pref that stores the configured printers (I presumed the IP of the printer, however I checked and each printer apparently has a SERIAL number derived from the `number` table).

### Use cases

- Machine preferences
  - Default printer
- Store preferences
  - To show dispensing directions UI (can simplify UI if unneeded for particular store)
  - Store specific label printing settings
- Global prefs
  - Errrr nothing applicable yet?
  - One case is for a default set of prefs that are configurable, and store prefs give finer grained overrides.

### Requirements

#### Must

- Sync. In many cases all central controlled, but potentially allow for local control (e.g. user preference controlled on remote site)
- Can be related to: Global, Store (and extended to) Machine, User (and Site?)
- Clean API with typing from backend through to frontend

#### Should

- Extendable for plugins

#### Could

- Defined hierarchy rules for overrides. At least a base definition and optional overriding preferences.
- Partial definitions if hierarchy. (Means Option fields everywhere...)

### Additional info

#### OG

OG has 2 sources of preferences which are similar but in storage field type, `pref_blob` and `pref`. The former is an arbitrary blob of data, the latter a 4D object field (serialised as JSON in sync). Neither have great rules for consistency. The blobs might be arrays of any value type, objects (possibly base64 encoded and stored as text, or primitive values). The `pref` objects at least are consistently object, but beyond that can have all the same wild adventures as the blobs. For instance, the boolean `pref` "Show direction entry in prescriptions" is the 28th bit in a 32bit integer used as a bit array. All the other bits are miscellaneous, mainly invoice related prefs.

Both follow the same field structure which likely has some wisdom attached from our context over 20 years:

- item: a unique string identifying the pref
- store_id: the pref applies to given store
- user_id: the pref applies to given user
- network_id: the pref applies to given machine identified with MAC address (this might not be ideal for devices with multiple network adapters)

Any, none or all of the above may be applied. If none are applied, then it's either a global pref OR a datafile specific pref. **Many settings in the preferences window are datafile specific, not global. There is no design pattern indicating which are which**

The tables have a troubled relationship with sync. On initialisation, there is a lot of cruft such as all the central server datafile preferences being synced e.g. the default printer for the central server machine, various site version metadata records... Unlike most tables, there is no trigger code handling sync. It is handled by **explicit** calls to queue the pref record for sites whenever the pref record are modified and it is necessary to sync them, which is easy to get wrong or neglect to do. They do not go into the central change log.

A big downside with these tables is the lack of strict typing around the shape of their pref data. It is often very hard to know what prefs exist in the system, why they exist and what shape their data is by looking at the code. It is often easier to analyse datafiles, dump prefs to JSON and text search to try find a relevant pref record if you're not sure what pref you're looking for. There is no enum or catalogue, and little to no dev documentation.

#### OMS

We currently just have a basic pref setup for store prefs. There is a `store_preference` table that has a column for each preference. This provides typing. There are some column limits of 1600 for postgres and ~32000 for sqlite, we're unlikely to hit those though.

This doesn't cover things such as machine or user preferences by it self. To follow this pattern for other requirements, you'd have to make the tables `user_preference` and `machine_preference` and so on. If a future requirement, cross overs of those prefs might not really work without getting crazy e.g. a user pref for a particular store.

## Options

### Option 1 - Take the lessons from OG `pref` table by doing the same

The OG pref table is battle tested for over a decade:

- We create a `preference` (or `pref`?) table with `id`, `item`, `store_id`, `user_id`, `machine_id` and `data` fields.
- The lack of typing that ailed OG can readily be addressed with a big struct in OMS. Thus structs may carry through to the frontend gql types as appropriate.
- Sync needs deeper thought, but at a glance: store prefs are easily identified and synced by the `store_id`. `user_id` could be added to `change_log` to handle that (if needed to sync... or we sync users and their prefs everywhere 😉). Perhaps it's OK to not sync and lose machine_id records.
- We store the pref data in an JSON text field. We deserialize this into a struct in the rust code to which provides sensible defaults for anything missing.
  - This does mean that sync does not validate the `data` field, that validation occurs when the record is accessed. Though, we could quickly deserialize at sync buffer integration time just to check!
- We can drop the `store_preference` table, but keep the repo the same for now, just querying from `preference` instead.
- The list of preferences is defined by a single struct in the backend. The backend is responsible for merging Global, Store, and potentially if required `User Prefs/Machine Prefs`.
The single struct can have additional complexity, e.g. struct within structs as required. This may require additional mapping to graphql though.

_Pros:_

- Consistency with OG can be easier to reason about between systems (provided it the OG pattern isn't hard to reason about to begin with...)
- Just 1 table and logic (i.e. 1 repo etc.)
- Generally flexible and battle tested
- Preferences rust struct gives single source of the all preferences defined in the system

_Cons:_

- Potentially more upfront effort right now
- Create need for design convention on how to structure preferences. Should you make an individual pref for every little thing, or group them together into many keys in the same pref's JSON? How many is too many? If ever concurrent editing of same record with race on saving, bigger JSON means more data lost without merge strategy. We can nest - how much nesting is TOO FAR?
  - structs defining pref shape should at least provide some tacit guardrails; if your struct is crazy maybe the pref should be broken down!
  - Requires dedicated code for configuration UI (as we don't know how pref might be structured)

### Option 2 - Add more preference tables like the current OMS `store_preference`

_Pros:_

- Lower effort for now

_Cons:_

- Some preferences might need more than one FK, e.g. user pref for a specific store or machine.

### Option 3 - Similar to `properties` and `name_properties` structure

With this option we'd define a list of `prefs` in the database that could be assigned, and what possible values they have e.g. float, int, boolean, controlled list.

Each preference has a `unique_key` assigned, this key is used to assign the value to when serialising/deserialising to json.

Each pref would record if it's relevent to apply at a global, store, or other level.

In sync we'd sync a `preference_data` record for each store and one global (for now) could add user, or machine etc as needed in future. This would have a json payload similar to Option 1.

There's nothing to stop us still deserialise them in a rust struct as needed

This option would allow us to develop a preference editor UI similar to what we have with editing store/name properties.

If you need some more complex type in your sync record, then it probably is worth creating a dedicated ui and management for this struct.

_Pros:_

- Re-uses an existing pattern
- Clear path for creating a UI without lots of over head for adding a new pref
- Can still deserialise to specific structs if needed
- Could be used by plugins to add additional prefs as needed

_Cons:_

- Could be larger payload as prefs aren't broken down into different areas
- Need to insert prefs into database rather than just adding to code? Maybe there's a code first way to achieve the same thing? Enums?

## Decision

Option 1

The list of available prefs will be defined by a struct in the Rust backend and available in graphql.
The UI will be manually created for each new pref as added to the struct.
This approach allows us to start small, with just Booleans for Global and Store Prefs initially, but can be expanded to more complex scenarios as required.

### Consequences

-  New prefs will required additional configuration UI to be manually created. But it should be a simple copy and paste type job
- There's still some potential risk for incompatible changes to come via sync to an old version for example. We'll need to be vigilant in code reviews to avoid this issue, and potentially favour creating new prefs if say a boolean pref needs to become a number for example. 
