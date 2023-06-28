# Multi Unit Number

- *Date*: 08/02/23
- *Deciders*:
- *Status*:
- *Outcome*: Option 2 (store preference table with store_id as primary key and columns as preferences)
- *Related Material*: See original [issue](https://github.com/openmsupply/open-msupply/issues/1089)

## Background

We've noticed user's confusion in understanding pack sizes. This is especially prominent when users transition from existing systems where pack size have been concealed (i.e. multiple variants of the same item, each defining its own pack size).

It seems like the core requirements are:

**1. Ability to treat an item as having one particular pack size in a particular facility (requirement to be confirmed)**

A couple of examples of this:
* **1.a** Lower level facility deals with millilitres (inpatient -> directly administer oral dose vai syringe to a patient) and and warehouse deals with bottles. Although it's possible to work around this by either recording consumption at lower level by bottles (not as accurate or efficient, when should they order next bottle ?) or by having base units as millilitre and large pack size at warehouse (manual conversion at the time order arrives, since we deal with base unit in order, it's much easier to comprehend 50 bottles vs 50000 mililitres)
* **1.b** Different facility levels deal with different base unit where facilities are not centrally managed (they are independent). For example warehouse deals with cartons and lower level facility deals with blisters (since requirement usually come from central level, and lower level facilities are independent, base unit in the system was configured as carton)

**2. Vaccine with varying number of doses per vial (requirement to be confirmed)**

It sounds like we've only come accross this with covid vaccines (and in places where multiple options of covid vaccines were available), for other vaccines there seems to be a standard of doses per vial. Since we currently set doses for item only this is problematic. Could create multiple items but then, may have issues with quantification (measuring consumption across multiple items)

**3. Ability to treat an item as having varying base pack size in different UI area (requirement to be confirmed)**

* **3.a** At a hospital, vaccines are dispensed in doses, counted and discarded (stocktake) in vials, ordered in doses and open vial wastage is recorded in doses.
* **3.b** In the warehouse, shipments are in vials but quantification and outgoing orders are in doses, incoming orders may need to be in vials (i.e. request to supply 100 vials of 10 rather then 1000 doses)

For this KDD it's very important to consider implementation effort now and in the future, since it will would touch core functional area.

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
- Users would need to deal with very large numbers at some point (i.e. for order, which are alwasy in base units)
- Doesn't deal with requirement **2**, unless we switch vaccine management to be via pack size or train to use fractional pack size

### Optoin 2 - Define item variants and assign to facilities

Define item variants, similar to the [Doses Vaccine Conversion 2023-04-27](https://docs.google.com/spreadsheets/d/1mWZqmfQRfHlwF5i2OADaBaSWalK3FbIJpauM275xYuA/edit#gid=937944726) spreadsheet:

![Nested units](./media/nested_units.png)

Then one unit type can be associated to a facility (through name_tag)

Now in that facility the base unit will reflect the unit type that was chosen.

If this conversion is done at graphql layer (back end), we have a smaller surface area to deal with (and can have generic translators for input/output, example to follow).

*Pros:*

- Deals with the core issue in a direct way

*Cons:*

- Some fragility is introduced due to configuration (i.e. it maybe easy to mess things up for a facility through configurations)
- Could cause issues if facility needs to deal with a different pack size, with this solution it would lead to fractional pack size (i.e. default unit for facility is of packsize 10, but we received pack size 5, this would mean there would be fractional number of packs).
- Need to make sure to always add the pack size conversion translator
- Doesn't quite deal with requirement **2** or **3**

*Extra:*

A few comment suggesting that user should also have an option to select which pack to deal with (meaning graphql would likely need to have a parameter for this ?)

### Option 3 - Use names rather then packsize (through pack 'lens')

I think this was the suggestion from the [Doses Vaccine Conversion 2023-04-27](https://docs.google.com/spreadsheets/d/1mWZqmfQRfHlwF5i2OADaBaSWalK3FbIJpauM275xYuA/edit#gid=937944726) spreadsheet:

Where unit types are defined, but the facility is not configured to use a particular unit, the unit type is chosen by the user (when ? not really sure but it looks like it should apply uniformly across all UI, also I am not sure how this applies to a list of items and do we store default one against facility ?)

*Pros:*

- Generic approach that deals with quite a few use cases

*Cons:*

- Not sure if it deals directly with original confusion of having the same item in different variant at the same facility (different pack sizes)
- Would require quite a lot of front end changes (it's a bit overwhelming to think about the number of changes, this indicates that it maybe too difficult to do safely at this stage)
- Existing user may need to be retrained
- High chance of fractional number of packs, when switching between child <-> parent units or when there is variation of pack sizes that a facility deals with

## Decision

Still, leaning towards Option 2, to me it's the only one that justifies effort now and in the future for the benifit. See `extra` section for infor about requirement **2**

## Extra

With any chosen solution, we should not change underlying storage of pack size and quantity for a batch (i.e. still the same schema and mechanims, only presentation layer is adjusted)

Requirement **2** complicates any solution that helps solve **1** and **3**, since it adds another variation to the mix. I've mentioned this a few times and would want to mention it again, I think vaccines should have a special logic and UI/UX, trying to address special cases for vaccines in a generic way would lead to complexity in implementation and complicated UX/UI. I suggest treating requirement **2** and maybe **3** as a separate design that applies to vaccines only.
