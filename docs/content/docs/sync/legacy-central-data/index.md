+++
title = "Data owned by Legacy mSupply"
weight = 55
sort_by = "weight"
template = "docs/page.html"
+++

# Data owned by Legacy mSupply

Which synced data Open mSupply (OMS) can't create or update, because it's authored in Legacy mSupply (OG, the 4D system) and only pulled down by v5 sync. Use this page when:

- you're asked "why can't I edit X in OMS?",
- you're adding a feature that would write to one of these tables,
- you're reviewing a change that touches their translators.

A user-facing version of this list is intended for the public docs (docs.msupply.foundation). This page adds the table names, the code evidence, and the edge cases.

## How a table ends up OG-owned

A table is OG-owned when **all** of the following hold:

1. **OMS pulls it but never pushes it.** Its translator in `server/service/src/sync/translations/` implements `try_translate_from_upsert_sync_record`, but `change_log_type()` returns `None`, so no changelog rows are created and `should_translate_to_sync_record` never matches. There is no `try_translate_to_upsert_sync_record`. Pull-only is the default; see [Adding a new synced table](../adding-a-table/v5-v6-and-v7/).
2. **There is no GraphQL mutation that writes it.** Check `server/schema.graphql`. Mutations such as `addFromMasterList` *read* these tables and don't count.
3. **OG sends it to OMS sites.** Either through the central change log (`SyncDataType = "central"` in OG's `tableSetupLookupData`), or through the site's sync queue for store, user and preference data (`sync_create_records_for_store`, `sync_get_syncing_sites`).

[Sync styles](../sync_styles/) classifies these as **Central · Central · v5**: "central data still served from legacy 4D". Note that this bucket is also a catch-all for unclassified tables, so not everything in it is OG-owned.

## OG-owned tables

All translator paths are relative to `server/service/src/sync/translations/`. "Change log" means OG's central change log, which every site pulls. "Queue" means OG queues the records only to the site that owns the store.

### Items

| Data | OG table | OMS translator | Sent by OG via |
|---|---|---|---|
| Items | `item` | `item.rs` (see [Item push](#item-push)) | Change log |
| Units | `unit` | `unit.rs` | Change log |
| Item categories | `item_category`, `item_category_level1/2`, `item_category2/3` | `category.rs` | Change log |
| Item directions | `item_direction` | `item_direction.rs` | Change log |
| Warnings | `warning` | `warning.rs` | Change log |
| Item warning links | `item_warning_link` | `item_warning_join.rs` | Change log |
| Item visibility | `item_store_join` | `item_store_join.rs` | Queue (store data) |

### Master lists and programs

| Data | OG table | OMS translator | Sent by OG via |
|---|---|---|---|
| Master lists | `list_master` | `master_list.rs` | Change log |
| Master list lines | `list_master_line` | `master_list_line.rs` | Change log |
| Master list assignment | `list_master_name_join` | `master_list_name_join.rs` | Change log |
| Program requisition settings | `list_master` (`programSettings`) | `program_requisition_settings.rs` | Change log |
| Period schedules | `periodSchedule` | `period_schedule.rs` | Change log |
| Periods | `period` | `period.rs` | Change log |
| Program indicators | `program_indicator` | `program_indicator.rs` | Change log |
| Indicator attributes | `indicator_attribute` | `indicator_attribute.rs` | Change log |

### Names

| Data | OG table | OMS translator | Sent by OG via |
|---|---|---|---|
| Suppliers, customers, facilities (not patients) | `name` | `name.rs` (see [Name push](#name-push)) | Change log (`type != 'patient'`) |
| Name categories | `name_category1`–`6`, `name_category1_level1/2` | `name_category.rs` | Change log |
| Name tags | `name_tag` | `name_tag.rs` | Change log |
| Name tag assignment | `name_tag_join` | `name_tag_join.rs` | Change log |
| Contacts | `contact` | `contact.rs` | Change log |
| Insurance providers | `insuranceProvider` | `insurance_provider.rs` | Change log |

### Stores, users and settings

| Data | OG table | OMS translator | Sent by OG via |
|---|---|---|---|
| Stores | `store` | `store.rs` | Change log, plus queue to sites where the store is visible |
| Users | `user` | `user.rs` | Queue |
| User store access | `user_store` | `user_store_permissions.rs` | Queue (store data) |
| OMS user permissions | `om_user_permission` | `user_permission.rs` | Queue (store data) |
| Store preferences | `pref` | `store_preference.rs` | Queue |
| Custom field labels | `pref`, `pref_blob` | `legacy_field_labels.rs` | Queue |

### Lookup lists

| Data | OG table | OMS translator | Sent by OG via |
|---|---|---|---|
| Reasons | `options` | `reason.rs` | Change log |
| Location types | `Location_type` | `location_type.rs` (`None // Not editable in OMS`) | Change log |
| Currencies | `currency` | `currency.rs` | Change log |
| Shipping methods | `ship_method` | `shipping_method.rs` | Change log |
| Transaction categories | `transaction_category` | `transaction_category.rs` | Change log |
| Purchase order categories | `purchase_order_category` | `purchase_order_category.rs` | Change log |
| Abbreviations | `abbreviation` | `abbreviation.rs` | Change log |
| Diagnoses | `diagnosis` | `diagnosis.rs` | Change log |
| VVM statuses | `vaccine_vial_monitor_status` | `vvm_status.rs` | Change log |

### Goods received

| Data | OG table | OMS translator | Sent by OG via |
|---|---|---|---|
| Goods received | `Goods_received` | `goods_received.rs` | Queue (store data) |
| Goods received lines | `Goods_received_line` | `goods_received_line.rs` | Queue (store data) |

## Edge cases

### Item push

`item.rs` has a `change_log_type()` and a push translation, but the push returns an error unless `CentralServerConfig::is_central_server()` ("Item push is only supported from the central server"). No GraphQL mutation writes the `item` row, so in practice items are OG-owned.

Item-related permissions don't change this:

| OG permission | OMS permission | What it actually guards |
|---|---|---|
| Edit items | `ItemMutate` → `Resource::MutateItems` | Only barcodes, on the OMS central server: `centralServer.barcode` `insertBarcode`, `confirmBarcodeProposal` and `deleteBarcode`, plus the deprecated top-level `insertBarcode` when run on central (`graphql/general/src/mutations/barcode.rs`). On remote sites any user with item access can `proposeBarcode` (`Resource::QueryItems`); central then confirms it. |
| Edit item names, codes and units | `ItemNamesCodesAndUnitsMutate` → `Resource::MutateItemNamesCodesAndUnits` | Item variants, bundled items and ancillary items (OMS-owned tables) |

The mapping is in `service/src/apis/permissions.rs` and the resources in `service/src/auth.rs`. The public [Permissions](https://docs.msupply.foundation/docs/settings/permissions/) page describes "Able to edit items" as "required when saving a barcode", which is accurate but easy to misread.

### Name push

`name.rs` does push, but only patients are created or edited in OMS (`insertPatient`, `updatePatient`, `updatePatientCustomFields`). Sync styles explains that on central "only the `Patient` clause accepts, so the only name-push central accepts is a patient name". `updateNameProperties` writes `name_oms_fields`, an OMS-owned table that syncs separately, not the `name` row.

### Similar-looking OMS-owned data

These are easy to confuse with the OG-owned tables above, but OMS authors them:

| OMS-owned | Not to be confused with (OG-owned) |
|---|---|
| `preference` (`upsertPreferences`, OMS central) | `pref` store preferences |
| `asset_log_reason` | `options` reasons |
| `location` (`insertLocation`/`updateLocation`) | `Location_type` |
| `name_insurance_join` (`insertInsurance`) | `insuranceProvider` |
| `vvm_status_log` | `vaccine_vial_monitor_status` |
| `om_form_schema` (`insertFormSchema`) | `form_schema` |
| Document registry via `document_registry_om.rs` | `om_document_registry` pulled from OG |
| `item_variant`, `bundled_item`, `ancillary_item` | `item` |

`clinician` is pulled from OG **and** created in OMS (`insertClinician`), so it isn't OG-owned.

## OG doesn't enforce this on receive

The OG-only rule holds because OMS never sends these tables, not because OG rejects them. In OG's `syncV5CentralProcessSyncRecord`:

- `currency` is the only table rejected outright ("Remote sites cannot update currency records").
- Tables with `SyncDataType = "store"` are checked: the record's store must belong to the sending site. The OMS central site is exempt from this check.
- Every other table, including all the change-log tables above, is saved as received. The save fires OG's triggers, so the change would then be sent to every site through the central change log.

So if you add push support for any table on this page, you are making OMS an author of central data. Discuss it first, and expect OG to accept the records without checking ownership.

OG ownership is described in the mSupply repo's `decisions/0007-sync-v5-central-server-change-log-and-queue-mutually-exclusive.md`: "Centrally Controlled data … almost entirely controlled on the Primary server … e.g. `item`, `master_list`".

## Keeping this page up to date

This page was checked against OMS `develop` at `b06262eaa3` (23 October 2026; the internal repo's server code was identical) and mSupply V9-04-14. Under [V7](../v7/), OMS central is expected to take over central data, so this list will shrink.

To re-check, list translators that pull but have no push:

```bash
cd server/service/src/sync/translations
for f in *.rs; do
  if grep -q try_translate_from_upsert_sync_record "$f" \
     && ! grep -q try_translate_to_upsert_sync_record "$f"; then
    echo "$f"
  fi
done
```

Then, for each result, check that `server/schema.graphql` has no mutation writing that table, and review `item.rs` and `name.rs` by hand.
