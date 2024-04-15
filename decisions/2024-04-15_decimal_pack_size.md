# Decimal Pack Sizes

- _Date_: 2024-04-16
- _Deciders_: @Chris-Petty, @roxy-dao, @clemens-msupply, @mark-prins, @andreievg, @craigdrown, @louisaw123, @Gwalior-84
- _Status_: PROPOSED
- _Outcome_: Option 1

## Context

In Legacy mSupply it is possible, though generally not recommended, to enter decimal values for pack sizes. These are stored as a f64 value in the 4D database. Few instances of this truly exist. Inspection of some production systems report that there is one stock line in all the history of the system where a line was introduced with decimal packsize (e.g. 0.1485 packsize for a medicine with `tabs` for units), and were promptly removed with inventory adjustment. This would suggest it merely being a data entry error. At least one country has thousands of trans_lines affected likely in error (gloves in packs of 2.5, vials in packs 0.2 etc.).

For sites converting from mSupply Legacy Desktop to Open mSupply, we need to ensure that the decimal values are either maintained or adjusted. Currently, Open mSupply only supports integer pack sizes, so must be a whole number or the lines will not be integrated. Open mSupply has integer pack sizes as in principle it is bad to manage discrete quantities with floating point numbers due to inaccuracy in calculations that can occur with floating point arithmetic. Handling migration of data was deferred.

The proposed legitimate occurrences of this would primarily come from managing liquids, particular in systems that use Litres/L as a unit. If repacking 1L into 40x 50mL bottles, you'd need to enter this in mSupply as 40x 0.05L bottles as we do not support unit conversions.

Goals:

- Must allow Legacy mSupply data to be initialised into Open mSupply via sync
- Must allow interoperability between Legacy and Open mSupply (i.e. transfers via sync)
- Must make sense to users, keeping grounded in recording digitally what is physically present. 40 bottles on the shelf should be 40 bottles in the system, no more no less.

### Additional Context

- mSupply back and forth trying to make decimals calculate/present correctly
  - [Tax rate](https://github.com/msupply-foundation/msupply/issues/10118#event-12127072697)
  - [ledger](https://github.com/msupply-foundation/msupply/issues/10508)
- [HSH KDD](https://github.com/msupply-foundation/health-supply-hub/blob/develop/docs/decisions/002-storing-monetary-values.md) generally deciding to use floats for monetary values.
- [HSH issue](https://github.com/msupply-foundation/health-supply-hub/issues/637) deciding that quantity, pack_size and unit_quantity needs to be float for easiest interoperability with mSupply tenders and consistency. Several changes were added to mSupply to strongly deter uses from using decimal pack sizes in their tender lines and making them confirm it.
- [OMS discussion](https://github.com/msupply-foundation/open-msupply/discussions/2905) for decimal values in stocktakes.
- [Internal OMS discussion](https://github.com/msupply-foundation/open-msupply/discussions/29) for decimal values in ledger and UI.
- [SAGE](https://www.greytrix.com/blogs/sageaccpacerp/2015/01/07/allow-fractional-quantities-in-purchase-order/) has a preference - allows 4 decimal places if on, zero if off. Permanent if switched on.
- [SAP](https://content.cnbssoftware.com/blog/rounding-issues-sap-uom) blog post detailing that SAP allows decimals. In this case appears to be 3dp allowed. They have Unit of Measure of "case", which contains 6 units of "each" (aka a box of 6 bottles), but it can be split as sometimes is required IRL. So 1/6 = 0.167. 6\*0.167 = 1.002 though ;-). Shenanigans are had - if stock out of 1 "each" then they make sure the source keeps the remainder i.e. `1 case - 1 each = 0.834` stock left at the source, rather than `0.833`. The receiving location gets `0.166`, rather than `1.67`. This way the amount in stock at the source location is never a partial each (>0, but <1). But now the receiver location has a partial each! When they do the next sales order, they bump the quantity in the order up to account for the "fractional dust" but are careful to only do it within a threshold to make sure it doesn't appear to send/create stock that never existed...

## Options

### Option 1 - Support Decimal Pack Size like Legacy mSupply

This is the most straight forward for migration/integration as it's 1-to-1, the fields are simply the same numeric type. Downsides include introducing another avenue of floating point inaccuracy in arithmetic. It makes sense to users, as they entered the data and it is presented in the manner they entered it.

There is potential for discrepancies to occur, e.g. store A repacks `1 * 1L` to `3 * 0.33L`. There are 0.01 packs of the original line... do we just zero it? If we issue all 3 to another store, they receive 0.99L. Do we round it up? What's the threshold?

_Pros:_

- Initialisation works with no effort
- Allows for targeted logic for file syncing (e.g rate limiting in future)
- Allows for files to be downloaded where they're needed rather than needing to sync everywhere (via std sync process)
- Straightforward for all reporting. What's in the invoice/requisition/PO/tender/GR is consistent with what the user entered.

_Cons:_

- UI needs to handle potentially large amounts of decimal digits gracefully. e.g. `1.3333333...` to `1.33` (2dp rounding, preference) or `1 1/3` (can be presented with neat HTML, but only nice for fractions with small denominators, harder to compare one cell to the next).
- Backend should keep full stored value to maximum accuracy. These values can be smoothed over in some cases (e.g 0.9999999999999997 can be rounded up and treated as 1 in UI, in the backend it'll be that quantity).
- Calculations will accrue inaccuracy. For individual lines this is usually tolerable but it does accumulate! In tenders we see it in monetary values: summing the "adjust cost" of several thousand lines can result in whole dollars of inaccuracy. Governments/Procurement agencies may have policies of acceptable level of calculation inaccuracy.
  - It is worth highlighting that number of packs and our monetary fields are all already floating point type with these same problems, so we must already handle all the above issues regardless. **So it's not really a con if we have to do it anyway.** It just makes the surface area of floating point accuracy a smidgen higher.
- recurring numbers create headaches of who truly has the "full" amount of something. E.g

### Option 2 - Round pack size up to next whole number and adjust number of packs, monetary fields etc.

We convert decimal pack sizes up to the next whole number.

E.g.

1 pack of 1L is repacked to 40 packs of 0.05L in mSupply desktop. The latter on integration in OMS:

1. pack size: 0.05L/0.05 = 1L
2. number of packs: 40packs\*0.05 = 1pack
3. cost/sell price: 0.5/0.05 = $10

The pharmacist feedback I have received on this is that it'd be confusing to users if they had a system telling them they had 1 of when they can see there are 40 smaller vessels on the shelf. For accounting, I have not asked a finance stakeholder yet but I presume this is very very bad form in regards of adjusting the number of what was physically ordered/received and the cost of each item ordered.

A potential solution for this is to use pack variants. After converting back to 1L pack size, we use a variant of "50mL bottle" that converts all the properties back in the UI layer. Pack variants don't appear to quite support this - the assumption is the base unit is a small whole number (integer). In this case we'd need a pack variant of 0.05L, which would do the reverse of the calculations above. There is additionally an issue of when and how these pack variants are generated, as they are centrally controlled data.

Going to the option 1 problem statement, we also have to solve this at integration still so no avoided in anyway:

> There is potential for discrepancies to occur, e.g. store A repacks `1 * 1L` to `3 * 0.33L`. There are 0.01 packs of the original line... do we just zero it? If we issue all 3 to another store, they receive 0.99L. Do we round it up? What's the threshold?

_Pros:_

- Open mSupply can keep using integer for pack sizes, which feels good in a programming lens. Floats with their inaccuracy are genuinely not ideal!

_Cons:_

- Unintuitive for users, stock levels in system no longer represents physical reality.
  - Could be assuaged by making pack variants support decimals by being f64 rather than i32. Is this just shifting the problem though? We'd still need to handle when and if rounding happens in UI and calculations no matter what we do.
  - Also then reporting must take into account pack variants? I think this might already be true, but with items affected by this automation/translation it'd be absolutely mandatory (might need a line.pack_variant_ID FK to make sure a line is presented in the known physical form explicitly).
- More complex translators updating all fields that are relative to pack size (number of packs, cost price, sell price). All these calculations introduce opportunity for float arithmetic inaccuracies to accumulate.
- Data reviewed on remote sites will not match the same data viewed on central server.

### Option 3 - Can convert units?

Specifically for cases like mL and L, it might be handy in repacks to allow 1L -> 1000mL. This could be converted. Then instead of items having units, they have a unit type, i.e. _volume_, _mass_ or _each_. Then when sending a fractional amount, it could automatically repack into a different volume. Monetary values may need to remain relative to a recorded base unit to avoid doing conversions of that as well, or perhaps we convert units too though they may become very small values ($1/L -> $0.001/mL).

In translation fractional pack sizes could be converted from one unit to another smaller unit that results in a whole number, but only if they're defined centrally. Unfortunately we can't universally predict this - as Per the SAP example a user might user "case" and "each", where there are 6 "each" in one "case". Do we define a separate "each" for each possible ration? 1:6, 1:10, 1:12... we certainly shouldn't generate units to get around it!

Pros:

- Tidy and intuitive-ish specifically for L and mL. For pharmacy users it means data stays directly mapping with physical stock.

Cons:

- Wide ranging impact and complexity especially in translations.
- Units are currently controlled in Legacy, so all would have to be preconfigured before integration is attempted on remote site.
- Doesn't logically work for all units, so feasibility is near 0 IMO.

### Option 4 - Switch all f64 amount fields to a monetary safe type

Decimals would be safe then. pgsql has one of these built in, sqlite does not. We'd need a rust implementation to manage these monetary values. One such rust crate is [rusty-money](https://crates.io/crates/rusty-money). It is of note that rust is a young language, and such libraries are relatively immature compared to [Java](https://docs.oracle.com/cd/E13166_01/alcs/docs51/javadoc/com/elasticpath/domain/misc/Money.html), [.NET](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-decimal) etc.

(Note .NET's `Decimal` has basically the same problems as f64 still, but the errors are relatively much smaller! Is a fancy 128bit number implementation rather than f64 standard)

This is too big a task. All reports and all database and business logic would have to be rewritten. OMS needed to commit to this early if at all so I think the ship has sailed, won't write anymore about it! Would have incurred a complexity tax on all development anyway, and Legacy would still be sending us f64 to deal with lol.

## Decision

**Option 1 - it is the simplest and the consequences are generally known.**

Option 2 is complex and doesn't explicitly solve the problems either. It requires using pack variants in a way that is not supported.

Option 3 is at least as complex if not more, also a bit undercooked ;-).

Option 4 no 🥲.

## Consequences

1. Pack sizes are changed to f64 across the data schema.
2. UI is updated to use rounding as configured in system. (largely already required - monetary values and number of packs are f64).
3. Ledger checks already need to account for float inaccuracy as number of packs already are f64, so not a new requirement.
