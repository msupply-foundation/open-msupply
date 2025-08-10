use crate::migrations::*;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::Deserialize;

pub(crate) struct Migrate;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncAction {
    Upsert,
}

table! {
    sync_buffer (record_id) {
        record_id -> Text,
        data -> Text,
        action -> crate::migrations::v2_09_01::invoice_line_shipped_pack_size_sync_buffer::SyncActionMapping,
        table_name -> Text,
        integration_error -> Nullable<Text>,
    }
}

table! {
    invoice_line (id) {
        id -> Text,
        shipped_pack_size -> Nullable<Double>,
    }
}

#[derive(Deserialize)]
pub struct LegacyTransLineRow {
    #[serde(rename = "sent_pack_size")]
    pub shipped_pack_size: Option<f64>,
}

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_line_shipped_pack_size_sync_buffer"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let sync_buffer_rows = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("trans_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in sync_buffer_rows {
            let legacy_row_or_error = serde_json::from_str::<LegacyTransLineRow>(&data);
            let legacy_row = match legacy_row_or_error {
                Ok(legacy_row) => {
                    if legacy_row.shipped_pack_size.is_none() {
                        continue;
                    }
                    legacy_row
                }
                Err(e) => {
                    diesel::update(sync_buffer::table)
                        .filter(sync_buffer::record_id.eq(&id))
                        .set(sync_buffer::integration_error.eq(e.to_string()))
                        .execute(connection.lock().connection())?;
                    println!("Error parsing legacy row for ID {}: {}", id, e);
                    continue;
                }
            };

            diesel::update(invoice_line::table)
                .filter(invoice_line::id.eq(id))
                .set(invoice_line::shipped_pack_size.eq(legacy_row.shipped_pack_size))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}
