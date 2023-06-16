# Multi Unit Number

- *Date*: 08/02/23
- *Deciders*:
- *Status*:
- *Outcome*: Option 2 (store preference table with store_id as primary key and columns as preferences)
- *Related Material*: See original [issue](https://github.com/openmsupply/open-msupply/issues/1089)

## Background

We've noticed user's confusion in understanding pack sizes. This is especially prominent when users transition from existing systems where pack size have been concealed (i.e. multiple variants of the same item, each defining its own pack size).

It seems like the core requirement is:

* We want to treat an item as having one particular pack size in a particular facility (requirement to be confirmed)

Although there seems to be another requirement that has evolved in an attempt to reduce the pack size confusion (or at least solutions that point to this requirement)

* Want to treat variations of packsizes in written form as item variant, not numbers ? (requirement to be confirmed)

There is another requirement that may contradict the first one or overlap it in some way

* We want to treat an item as having one or two particular pack sizes in particular facilitiy, based on functional area ? i.e. when dispensing vaccines should be trated in doses, when doing stocktake, in vials, when ordering in doses, when counting open vial wastage in both ? (requirement to be confirmed)

## Options

### Option 1 - Training + Clear and common vocabulary 

Very clear language (used uniformly across all of the UI), i.e.:

Number of units (vs quantity or total)

Number of packs (vs Pack Qty etc..)

Have a very solid onboarding during training, focused on concept of packs and units (as the first training task). Showing scenarior where it's important to deal with different packs at the same facility. And explaining the glossary terms that are used in the system and how they relate to these concepts.

*Pros:*

- Most flexible (the system was originally design to be this way for a good reason, but of course original target user group maybe quite different to the user group in this KDD)

*Cons:*

- Ideally our UI/UX would not need to rely too much on training (it would be intuative for a range of users), maybe this one can be turned into a pro if we improve presentation ¯\_(ツ)_/¯
- In some places like in requisition, we deal with Number of Units (so can't really deal with Number of Packs), although there has been an option added to order in packs, but that default for the item (across all stores)

### Optoin 2 - Define item variants and assign to facilities

Define item variants, similar to the [Doses Vaccine Conversion 2023-04-27](https://docs.google.com/spreadsheets/d/1mWZqmfQRfHlwF5i2OADaBaSWalK3FbIJpauM275xYuA/edit#gid=937944726) spreadsheet:

![Nested units](./media/nested_units.png)

Then one unit type can be associated to a facility (through name_tag).

Now in that facility the base unit will reflect the unit type that was chosen.

If this conversion is done at graphql layer (back end), we have a smaller surface area to deal with (and can have generic translators for input/output, example to follow).

*Pros:*

- Deals with the core issue in a direct way

*Cons:*

- Some fragility is introduced due to configuration (i.e. it maybe easy to mess things up for a facility through configurations)
- Could cause issues if facility needs to deal with a different pack size, with this solution it would lead to fractional pack size (i.e. default unit for facility is of packsize 10, but we received pack size 5, this would mean there would be fractional number of packs).
- Need to make sure to always add the pack size conversion translator

### Option 3 - Use names rather then packsize (through pack 'lens')

I think this was the suggestion from the [Doses Vaccine Conversion 2023-04-27](https://docs.google.com/spreadsheets/d/1mWZqmfQRfHlwF5i2OADaBaSWalK3FbIJpauM275xYuA/edit#gid=937944726) spreadsheet:

Where unit types are defined, but the facility is not configured to use a particular unit, the unit type is chosen by the user (when ? not really sure but it looks like it should apply uniformly across all UI, also I am not sure how this applies to a list of items and do we store default one against facility ?)

*Pros:*

- Generic approach that deals with quite a few use cases

*Cons:*

- Not sure if it deals directly with original confusion of having the same item in different variant at the same facility (different pack sizes)
- Would require quite a lot of front end changes (it's a bit overwhelming to think about the number of changes, this indicates that it maybe too difficult to do safely at this stage)
- Existing user may need to be retrained
- High chance of fractional number of packs, when switching between child <-> parent units

## Decision

Leaning towards Option 2
