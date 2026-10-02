use crate::migrations::*;
use diesel::prelude::*;
use std::collections::{HashMap, HashSet};
use util::barcode::normalise_barcode;

/// Moves barcodes to the confirmed/proposed model
/// (decisions/2026-09-30_barcodes.md, Option 4):
///
/// - `barcode` holds confirmed barcodes, authored on central only. Several rows
///   may share a value, one per item. `gtin` becomes `value`, the barcode in its
///   standard form with its scheme (`gtin:09506682101352`, `plain:ABC123`).
///   `item_id` becomes `item_link_id` so barcodes follow item merges, removal is
///   a soft delete, and the unused `parent_id` goes.
/// - `barcode_proposal` is new: barcodes a store has learned, synced up to central
///   for review.
/// - `stock_line.barcode_id` is replaced by `stock_line.barcode`, the value, and
///   `invoice_line.barcode` is added, so lines record what was scanned whether or
///   not it's confirmed.
///
/// Every existing row stays a confirmed barcode and keeps its id. Rows that turn
/// out to be the same barcode for the same item once in standard form (e.g.
/// `9506682101352` and `09506682101352`) are merged: the first by id is kept and
/// the others dropped, together with their changelog entries.
pub(crate) struct Migrate;

mod old {
    table! {
        barcode (id) {
            id -> Text,
            gtin -> Text,
            item_id -> Text,
            pack_size -> Nullable<Double>,
            manufacturer_link_id -> Nullable<Text>,
        }
    }
}

table! {
    barcode (id) {
        id -> Text,
        value -> Text,
        item_link_id -> Text,
        pack_size -> Nullable<Double>,
        manufacturer_link_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

table! {
    stock_line (id) {
        id -> Text,
        barcode -> Nullable<Text>,
    }
}

#[derive(Queryable)]
struct OldBarcodeRow {
    id: String,
    gtin: String,
    item_id: String,
    pack_size: Option<f64>,
    manufacturer_link_id: Option<String>,
}

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "barcode_proposals"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // 1. Lines hold the barcode value. Copy each stock line's barcode across as
        // scanned, to be put in standard form below, then drop the link so nothing
        // references the old barcode table.
        sql!(
            connection,
            r#"
                ALTER TABLE stock_line ADD COLUMN barcode TEXT;
                UPDATE stock_line SET barcode = (
                    SELECT gtin FROM barcode WHERE barcode.id = stock_line.barcode_id
                ) WHERE barcode_id IS NOT NULL;
                DROP INDEX IF EXISTS index_stock_line_barcode_id;
                ALTER TABLE stock_line DROP COLUMN barcode_id;

                ALTER TABLE invoice_line ADD COLUMN barcode TEXT;
            "#
        )?;

        // 2. Read the old barcodes before replacing the table.
        let old_rows: Vec<OldBarcodeRow> = old::barcode::table
            .select((
                old::barcode::id,
                old::barcode::gtin,
                old::barcode::item_id,
                old::barcode::pack_size,
                old::barcode::manufacturer_link_id,
            ))
            .order(old::barcode::id.asc())
            .load(connection.lock().connection())?;

        sql!(
            connection,
            r#"
                DROP TABLE barcode;

                CREATE TABLE barcode (
                    id TEXT NOT NULL PRIMARY KEY,
                    value TEXT NOT NULL,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    pack_size {DOUBLE},
                    manufacturer_link_id TEXT REFERENCES name_link(id),
                    deleted_datetime {DATETIME},
                    UNIQUE (value, item_link_id)
                );
                CREATE INDEX index_barcode_item_link_id ON barcode (item_link_id);

                CREATE TABLE barcode_proposal (
                    id TEXT NOT NULL PRIMARY KEY,
                    value TEXT NOT NULL,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    pack_size {DOUBLE},
                    manufacturer_link_id TEXT REFERENCES name_link(id),
                    store_id TEXT NOT NULL REFERENCES store(id),
                    user_id TEXT NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    updated_datetime {DATETIME} NOT NULL,
                    UNIQUE (store_id, value, item_link_id)
                );
                CREATE INDEX index_barcode_proposal_value ON barcode_proposal (value);
                CREATE INDEX index_barcode_proposal_item_link_id ON barcode_proposal (item_link_id);
            "#
        )?;

        // 3. Put every old barcode back as a confirmed barcode in standard form.
        let mut seen: HashSet<(String, String)> = HashSet::new();
        let mut dropped_ids: Vec<String> = Vec::new();
        for row in old_rows {
            // The old table allowed any text; a blank one can't be a barcode.
            let Some(normalised) = normalise_barcode(&row.gtin) else {
                dropped_ids.push(row.id);
                continue;
            };
            let value = normalised.id();
            // item_link.id == item.id by convention, and nothing was merged through
            // the old item_id column
            if !seen.insert((value.clone(), row.item_id.clone())) {
                dropped_ids.push(row.id);
                continue;
            }
            diesel::insert_into(barcode::table)
                .values((
                    barcode::id.eq(&row.id),
                    barcode::value.eq(&value),
                    barcode::item_link_id.eq(&row.item_id),
                    barcode::pack_size.eq(row.pack_size),
                    barcode::manufacturer_link_id.eq(&row.manufacturer_link_id),
                ))
                .execute(connection.lock().connection())?;
        }

        for chunk in dropped_ids.chunks(500) {
            let ids = chunk
                .iter()
                .map(|id| format!("'{}'", id.replace('\'', "''")))
                .collect::<Vec<_>>()
                .join(",");
            sql!(
                connection,
                "DELETE FROM changelog WHERE table_name = 'barcode' AND record_id IN ({ids});"
            )?;
        }

        // 4. Stock line barcodes in standard form, one update per distinct barcode.
        let stock_line_barcodes: Vec<String> = stock_line::table
            .filter(stock_line::barcode.is_not_null())
            .select(stock_line::barcode.assume_not_null())
            .distinct()
            .load(connection.lock().connection())?;
        let standard_forms: HashMap<String, Option<String>> = stock_line_barcodes
            .into_iter()
            .map(|raw| {
                let value = normalise_barcode(&raw).map(|b| b.id());
                (raw, value)
            })
            .collect();
        for (raw, value) in standard_forms {
            diesel::update(stock_line::table.filter(stock_line::barcode.eq(&raw)))
                .set(stock_line::barcode.eq(value))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}
