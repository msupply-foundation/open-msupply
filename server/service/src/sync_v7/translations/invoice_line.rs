use repository::{syncv7::SyncRecordSerializeError, ChangeLogInsertRow, InvoiceLineRow, Upsert};

use crate::sync_v7::{serde::DeserializeResult, validate_translate_integrate::SyncContext};

/// Deserialise an invoice_line and, when this site is a transfer recipient
/// (a remote site receiving the row for a store it doesn't own), null
/// `stock_line_id` and `location_id` — those FKs reference records on the
/// sending site that won't exist here.
pub(crate) fn translate_invoice_line(
    changelog_insert: ChangeLogInsertRow,
    owning_store_id: Option<&str>,
    data: &serde_json::Value,
    sync_context: &SyncContext,
) -> DeserializeResult {
    let mut row: InvoiceLineRow = serde_json::from_value(data.clone())
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?;

    if let (SyncContext::Remote { active_stores, .. }, Some(store_id)) =
        (sync_context, owning_store_id)
    {
        if !active_stores.store_ids().iter().any(|s| s == store_id) {
            row.stock_line_id = None;
            row.location_id = None;
        }
    }

    Ok(vec![(Box::new(row) as Box<dyn Upsert>, changelog_insert)])
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::sync::ActiveStoresOnSite;
    use repository::{ChangelogTableName, NameRow, RowActionType, Store, StoreRow};

    fn site_with_store(store_id: &str) -> ActiveStoresOnSite {
        ActiveStoresOnSite {
            site_id: 1,
            stores: vec![Store {
                store_row: StoreRow {
                    id: store_id.into(),
                    ..Default::default()
                },
                name_row: NameRow::default(),
            }],
        }
    }

    fn input_row() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "line_x".into(),
            stock_line_id: Some("sender_stock_line".into()),
            location_id: Some("sender_location".into()),
            ..Default::default()
        }
    }

    fn changelog_for(row: &InvoiceLineRow) -> ChangeLogInsertRow {
        ChangeLogInsertRow {
            table_name: ChangelogTableName::InvoiceLine,
            record_id: row.id.clone(),
            row_action: RowActionType::Upsert,
            ..Default::default()
        }
    }

    fn translated(result: DeserializeResult) -> InvoiceLineRow {
        let (mut upsert, _) = result.unwrap().pop().unwrap();
        upsert
            .as_mut_any()
            .and_then(|any| any.downcast_mut::<InvoiceLineRow>())
            .unwrap()
            .clone()
    }

    #[test]
    fn nulls_cross_site_fks_on_transfer_recipient() {
        let input = input_row();
        let data = serde_json::to_value(&input).unwrap();
        let ctx = SyncContext::Remote {
            is_initialising: false,
            active_stores: site_with_store("our_store"),
        };

        let translated_row = translated(translate_invoice_line(
            changelog_for(&input),
            Some("sender_store"),
            &data,
            &ctx,
        ));

        assert_eq!(translated_row.stock_line_id, None);
        assert_eq!(translated_row.location_id, None);
    }

    #[test]
    fn preserves_fks_when_row_is_for_our_own_store() {
        let input = input_row();
        let data = serde_json::to_value(&input).unwrap();
        let ctx = SyncContext::Remote {
            is_initialising: false,
            active_stores: site_with_store("our_store"),
        };

        let translated_row = translated(translate_invoice_line(
            changelog_for(&input),
            Some("our_store"),
            &data,
            &ctx,
        ));

        assert_eq!(translated_row.stock_line_id, input.stock_line_id);
        assert_eq!(translated_row.location_id, input.location_id);
    }

    #[test]
    fn preserves_fks_on_central() {
        let input = input_row();
        let data = serde_json::to_value(&input).unwrap();
        let ctx = SyncContext::Central {
            source_site_active_store_ids: vec!["any_store".into()],
        };

        let translated_row = translated(translate_invoice_line(
            changelog_for(&input),
            Some("any_store"),
            &data,
            &ctx,
        ));

        assert_eq!(translated_row.stock_line_id, input.stock_line_id);
        assert_eq!(translated_row.location_id, input.location_id);
    }
}
