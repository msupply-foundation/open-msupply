use crate::migrations::*;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::Deserialize;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncAction {
    Upsert,
}

table! {
    sync_buffer (record_id) {
        record_id -> Text,
        data -> Text,
        action -> crate::migrations::v2_20_00::add_linked_invoice_line_id_to_invoice_line::SyncActionMapping,
        table_name -> Text,
        integration_error -> Nullable<Text>,
    }
}

table! {
    invoice_line (id) {
        id -> Text,
        linked_invoice_line_id -> Nullable<Text>,
    }
}

#[derive(Deserialize)]
pub struct LegacyTransLineRow {
    #[serde(default, rename = "linked_trans_line_ID")]
    pub linked_invoice_line_id: Option<String>,
}

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_linked_invoice_line_id_to_invoice_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN linked_invoice_line_id TEXT;
            "#
        )?;

        let trans_line_sync_buffer = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("trans_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in trans_line_sync_buffer {
            let linked_id = match serde_json::from_str::<LegacyTransLineRow>(&data) {
                Ok(row) => match row.linked_invoice_line_id {
                    Some(ref s) if !s.is_empty() => s.clone(),
                    _ => continue,
                },
                Err(e) => {
                    diesel::update(sync_buffer::table)
                        .filter(sync_buffer::record_id.eq(&id))
                        .set(sync_buffer::integration_error.eq(e.to_string()))
                        .execute(connection.lock().connection())?;
                    continue;
                }
            };

            diesel::update(invoice_line::table)
                .filter(invoice_line::id.eq(&id))
                .set(invoice_line::linked_invoice_line_id.eq(linked_id))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}
