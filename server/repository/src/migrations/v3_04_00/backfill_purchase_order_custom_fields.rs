use crate::migrations::*;
use diesel::{prelude::*, sql_query, sql_types::Text};

/// Fills existing orders' custom fields from `sync_buffer`, and replays the category and label records.
pub(crate) struct Migrate;

#[derive(QueryableByName)]
struct SyncBufferData {
    #[diesel(sql_type = Text)]
    record_id: String,
    #[diesel(sql_type = Text)]
    data: String,
}

const MAPPED_FIELDS: [(&str, &str); 3] = [
    ("category_ID", "purchase_order_category"),
    ("user_field_1", "purchase_order_user_field_1"),
    ("user_field_2", "purchase_order_user_field_2"),
];

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "backfill_purchase_order_custom_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let rows: Vec<SyncBufferData> = sql_query(
            "SELECT record_id, data FROM sync_buffer WHERE table_name = 'purchase_order'",
        )
        .load(connection.lock().connection())?;

        let update = if cfg!(feature = "postgres") {
            "UPDATE purchase_order SET custom_fields = CAST($1 AS jsonb) WHERE id = $2"
        } else {
            "UPDATE purchase_order SET custom_fields = $1 WHERE id = $2"
        };

        for row in rows {
            let Ok(serde_json::Value::Object(legacy)) = serde_json::from_str(&row.data) else {
                continue;
            };
            let custom_fields: serde_json::Map<String, serde_json::Value> = MAPPED_FIELDS
                .iter()
                .filter_map(|(legacy_key, key)| {
                    let value = legacy.get(*legacy_key)?.as_str()?;
                    (!value.is_empty()).then(|| (key.to_string(), value.into()))
                })
                .collect();
            if custom_fields.is_empty() {
                continue;
            }
            sql_query(update)
                .bind::<Text, _>(serde_json::Value::Object(custom_fields).to_string())
                .bind::<Text, _>(&row.record_id)
                .execute(connection.lock().connection())?;
        }

        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET is_integrated = FALSE,
                        integration_datetime = NULL,
                        integration_error = NULL
                    WHERE table_name = 'purchase_order_category'
                       OR (table_name = 'pref_blob' AND data LIKE '%purchase_cust%field%');
            "#
        )?;

        Ok(())
    }
}
