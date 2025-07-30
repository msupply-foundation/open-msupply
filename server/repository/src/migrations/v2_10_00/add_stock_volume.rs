use crate::migrations::{
    templates::add_data_from_sync_buffer::{sync_buffer, SyncAction},
    *,
};
use anyhow::Context;
use diesel::prelude::*;
use serde::Deserialize;

pub(crate) struct Migrate;

table! {
    stock_line (id) {
        id -> Text,
        total_volume -> Double,
        volume_per_pack -> Double,
    }
}

table! {
    invoice_line (id) {
        id -> Text,
        volume_per_pack -> Double,
    }
}

table! {
    stocktake_line (id) {
        id -> Text,
        volume_per_pack -> Double,
    }
}

#[derive(Deserialize)]
pub struct LegacyStockLineRow {
    pub total_volume: f64,
    pub volume_per_pack: f64,
}

#[derive(Deserialize)]
pub struct LegacyTransLineRow {
    pub volume_per_pack: f64,
}

#[derive(Deserialize)]
pub struct LegacyStocktakeLineRow {
    pub volume_per_pack: f64,
}

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_stock_volume"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stock_line ADD COLUMN total_volume {DOUBLE} NOT NULL DEFAULT 0.0;
                ALTER TABLE stock_line ADD COLUMN volume_per_pack {DOUBLE} NOT NULL DEFAULT 0.0;
                ALTER TABLE invoice_line ADD COLUMN volume_per_pack {DOUBLE} NOT NULL DEFAULT 0.0;
                ALTER TABLE stocktake_line ADD COLUMN volume_per_pack {DOUBLE} NOT NULL DEFAULT 0.0;
            "#
        )?;

        let stock_line_sync_buffer = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("item_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in stock_line_sync_buffer {
            let legacy_row = serde_json::from_str::<LegacyStockLineRow>(&data)
                .with_context(|| format!("Cannot parse stock line sync buffer data: {data}"))?;

            diesel::update(stock_line::table)
                .filter(stock_line::id.eq(id))
                .set((
                    stock_line::total_volume.eq(legacy_row.total_volume),
                    stock_line::volume_per_pack.eq(legacy_row.volume_per_pack),
                ))
                .execute(connection.lock().connection())?;
        }

        let invoice_line_sync_buffer = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("trans_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in invoice_line_sync_buffer {
            let legacy_row = serde_json::from_str::<LegacyTransLineRow>(&data)
                .with_context(|| format!("Cannot parse invoice line sync buffer data: {data}"))?;
            diesel::update(invoice_line::table)
                .filter(invoice_line::id.eq(id))
                .set(invoice_line::volume_per_pack.eq(legacy_row.volume_per_pack))
                .execute(connection.lock().connection())?;
        }

        let stocktake_line_sync_buffer = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("Stock_take_lines")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in stocktake_line_sync_buffer {
            let legacy_row = serde_json::from_str::<LegacyStocktakeLineRow>(&data)
                .with_context(|| format!("Cannot parse stocktake line sync buffer data: {data}"))?;
            diesel::update(stocktake_line::table)
                .filter(stocktake_line::id.eq(id))
                .set(stocktake_line::volume_per_pack.eq(legacy_row.volume_per_pack))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}
