# Store Preferences

- *Date*: 08/02/23
- *Deciders*: Mark, Clemens, James, Andrei
- *Status*: DECIDED
- *Outcome*: Option 2 (store preference table with store_id as primary key and columns as preferences)
- *Related Material*: issue comment [Option 1](https://github.com/openmsupply/open-msupply/issues/973#issuecomment-1401165427), [Option 2](https://github.com/openmsupply/open-msupply/issues/973#issuecomment-1397753763) 

## Background

Preferences are used to configure behaviour of application, there are multiple preferences in mSupply. 
Preferences apply to different areas (i.e. by store, globally, etc..). 
Preferences in mSupply are stored in [pref] table with preference values in [pref]data and 'area' where they apply in other columns i.e. [pref]store_id. 
This KDD is focused on Store Preferences but a wider preferences context should be considered, see Appending at the bottom of KDD for an example of store preference record in mSupply.

## Preferences and sync

[pref] table does sync, it's not straightforward though, as [pref] table can be central, remote and local data. 
Store Preferences are centrally controlled and will sync to corresponding stores

## Requirements

1. Sync, store and use preferences for a store
2. Store will have multiple preferences, each of different type
3. Preferences are known at compile time
4. Preference for store may not exist (should have default value)

## Related or Future requirements

Global preferences -> Wouldn't need store_id
Local preferences -> Similar to key value store, but for local store preferences would need to add store_id to key value store
Dynamic preferences -> plugins ?

## Options

### Option 1 - [preference] -> [preference_store_join]

Use [preference] and [preference_store_join] table

The idea is taken from [this comment issue](https://github.com/openmsupply/open-msupply/issues/973#issuecomment-1401165427).

[preference] table is populated with preference types and values are store on [preference_store_join], [preference_store_join] would need to have optional value columns of all of the different types (similar to key value store)

*Pros:*

- Faster to add new preference

*Cons:*

- Schema does not describe what preferences are available
- Harder for new devs to understand
- Value typing is not enforced by schema
- More tables to sync
- Schema does not restrict one preference value for store (needs to be guaranteed in code)

### Option 2 - Table

[store_preference] table, [store_preference]store_id as primary key and strongly typed columns for preferences for that store. 
StorePreferenceRow data type specifies default values with default trait implementation unwrap_or_default can be used if store_preference does not exist for a store.

*Pros:*

- Strong typed values
- Schema describes all available preferences and their data types

*Cons:*

- Slower to add new preferences

### Option 3 - Key value store

Add store_id to key value store

*Pros:*

- Fastest way to implement this functionality

*Cons:*

- Schema does not describe what preferences are available
- Value typing is not enforced by schema
- Schema does not restrict one preference value for store (needs to be guaranteed in code)

## Decision

I vote on Option 2, I think we should aim to have a strongly typed system (one reason Rust apps are so stable is because of strong type checking, and we've chosen Rust not only for speed but for stability).
Also I think Option 2 is the simplest solution.

## Adding new preference

In `Option 2` there is a con `Slower to add new preference`, I am not quite sure if this is the case, especially considering that preferences should have defaults (and default are easier to reason about when they are defined closer to data structure rather then when the data structure is used). 
Since I am not familiar with how `Option 1` is used, I'll just give eamples of `Option 2` and `Option 3`, with new preference with new data type (an enum similar to `good_receipt_finalise_next_action` preference).

`Option 2`

* Add migration to add new column and data type to store preference (with default value specified in migration)
* Add new enum for that data type in db layer and add the column in db layer
* Add default value for the `StorePreference` default trait implementation
* Migration to go through [pref] sync buffer row and update existing store_preference rows with the preference

`Option 3`

* Add migration to add new optional column and data type to key value store
* Add new enum for that data type in db layer and a new method to get/set that data type for store_id (with default value specified in the get method)
* Migration to go through [pref] sync buffer row and add new key value for respective store_ids

For another example where new data type is not added, say it's `monthsOverstock` and we already have integer type in key value store, there are technically less changes for `Option 3` but for default value new method would need to be made to get that preference for store OR default value is used at the time preference is used, and if the preference is used in multiple places it spreads the default logic to multiple areas. 
With `Option 2` we can always specify default value in the schema and in the `StorePreference` default trait implementation.

## Appendix - mSupply store_preference

[pref]item: store_preferences
[pref]ID: {uuid()}
[pref]store_ID: {store_id}
[pref]data:
```json
{
    "sort_batches_by_VVM_not_expiry": false,
    "new_patients_visible_in_this_store_only": true,
    "new_names_visible_in_this_store_only": true,
    "can_enter_total_distribution_quantities": false,
    "round_up_distribute_quantities": false,
    "can_pack_items_into_multiple_boxes": false,
    "can_issue_in_foreign_currency": false,
    "edit_sell_price_on_customer_invoice_lines": false,
    "purchase_order_must_be_authorised": false,
    "finalise_customer_invoices_automatically": false,
    "customer_invoices_must_be_authorised": false,
    "customer_invoice_authorisation_needed_only_if_over_budget": false,
    "confirm_customer_invoices_automatically": false,
    "supplier_invoices_must_be_authorised": false,
    "confirm_supplier_invoices_automatically": false,
    "goods_received_lines_must_be_authorised": false,
    "must_enter_locations_on_goods_received": false,
    "can_specify_manufacturer": false,
    "show_item_unit_column_while_issuing": false,
    "log_editing_transacts": false,
    "default_item_packsize_to_one": true,
    "shouldAuthoriseResponseRequisition": false,
    "includeRequisitionsInSuppliersRemoteAuthorisationProcesses": false,
    "canLinkRequistionToSupplierInvoice": false,
    "responseRequisitionAutoFillSupplyQuantity": false,
    "useExtraFieldsForRequisitions": false,
    "CommentFieldToBeShownOnSupplierInvoiceLines": false,
    "UseEDDPlaceholderLinesOnSupplierInvoice": false,
    "consolidateBatches": false,
    "editPrescribedQuantityOnPrescription": false,
    "chooseDiagnosisOnPrescription": false,
    "useConsumptionAndStockFromCustomersForInternalOrders": false,
    "alertIfDispensingSameVaccine": false,
    "monthlyConsumptionEnforceLookBackPeriod": false,
    "usesVaccineModule": false,
    "usesDashboardModule": false,
    "usesCashRegisterModule": false,
    "usesPaymentModule": false,
    "usesPatientTypes": false,
    "usesHideSnapshotColumn": false,
    "pickfaceReplenishmentsMustAuthorised": false,
    "ableToSpecifyVVMStatusWhenReceivingItems": false,
    "good_receipt_finalise_next_action": "supplier_invoice_on_hold",
    "stock_transfer_supplier_invoice_is_on_hold": true,
    "monthlyConsumptionLookBackPeriod": "0",
    "monthsLeadTime": "0",
    "usesDispensaryModule": false,
    "monthsOverstock": 6,
    "monthsUnderstock": 3,
    "monthsItemsExpire": 3,
    "boxPrefix": "",
    "boxPercentageSpace": 0
}
```
