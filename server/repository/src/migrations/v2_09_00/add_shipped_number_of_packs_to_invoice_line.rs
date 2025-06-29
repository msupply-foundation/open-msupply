use crate::migrations::{
    templates::add_data_from_sync_buffer::{sync_buffer, SyncAction},
    *,
};
use anyhow::Context;
use diesel::prelude::*;
use serde::Deserialize;

pub(crate) struct Migrate;

table! {
    invoice_line (id) {
        id -> Text,
        shipped_number_of_packs -> Nullable<Double>,
    }
}

#[derive(Deserialize)]
pub struct LegacyTransLineRow {
    #[serde(rename = "sentQuantity")]
    pub shipped_number_of_packs: Option<f64>,
}

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_shipped_number_of_packs_to_invoice_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN shipped_number_of_packs DOUBLE PRECISION;
            "#
        )?;

        let sync_buffer_rows = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("trans_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in sync_buffer_rows {
            let legacy_row = serde_json::from_str::<LegacyTransLineRow>(&data)
                .with_context(|| format!("Cannot parse sync buffer row data: {}", data))?;

            diesel::update(invoice_line::table)
                .filter(invoice_line::id.eq(id))
                .set(invoice_line::shipped_number_of_packs.eq(legacy_row.shipped_number_of_packs))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}
