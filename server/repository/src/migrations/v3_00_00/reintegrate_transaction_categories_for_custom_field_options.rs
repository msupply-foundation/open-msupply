use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate_transaction_categories_for_custom_field_options"
    }

    /// Backfill `custom_field_option` for legacy transaction categories.
    ///
    /// `TransactionCategoryTranslation` (central-only) emits a
    /// `custom_field_option` row per `transaction_category` record, mapping
    /// mSupply transaction categories onto the per-type category OPTION
    /// custom_fields (keyed `<type>_category`, e.g. `inbound_shipment_category`)
    /// seeded by `central_mapping_custom_fields`. Existing sites
    /// integrated those records before the translator existed (previously
    /// untranslated), and central data only re-flows from OG on initialisation
    /// or change — so the options would otherwise stay empty.
    ///
    /// Same mechanism as `reintegrate_categories_for_custom_field_options`:
    /// `sync_buffer` is append-only, so flipping `is_integrated` moves the raw
    /// records back into the pending partition and the next sync cycle replays
    /// them through the translator (after the mapping custom_fields are seeded).
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET is_integrated = FALSE,
                        integration_datetime = NULL,
                        integration_error = NULL
                    WHERE table_name = 'transaction_category';
            "#
        )?;

        Ok(())
    }
}
