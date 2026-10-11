use crate::migrations::*;
use chrono::Utc;
use diesel::prelude::*;
use std::collections::{HashMap, HashSet};
use util::{barcode::normalise_barcode, constants::SYSTEM_USER_ID, uuid::uuid};

/// Moves barcodes to proposals and packaging variants
/// (decisions/2026-09-30_barcodes.md, Option 6):
///
/// - `packaging_variant.barcode` holds a confirmed barcode, in its standard form
///   with its scheme (`gtin:09506682101352`, `plain:ABC123`).
/// - `barcode_proposal` is new: barcodes a store has learned, synced up to central
///   for review.
/// - `stock_line.barcode_id` is replaced by `stock_line.barcode`, the value, and
///   `invoice_line.barcode` is added, so lines record what was scanned whether or
///   not it's confirmed.
/// - Every barcode this site has becomes a proposal from a store on this site, so
///   it syncs up to central. Barcodes from legacy mSupply reached every site, so
///   several sites propose them and central confirms them without review; the
///   rest wait for review. A site with no store of its own proposes nothing.
///   Rows that are the same barcode for the same item once in standard form (e.g.
///   `9506682101352` and `09506682101352`) become one proposal, from the first by
///   id.
/// - `barcode` is dropped, along with its changelog entries.
pub(crate) struct Migrate;

table! {
    barcode (id) {
        id -> Text,
        gtin -> Text,
        item_id -> Text,
        pack_size -> Nullable<Double>,
        manufacturer_link_id -> Nullable<Text>,
    }
}

table! {
    barcode_proposal (id) {
        id -> Text,
        value -> Text,
        item_link_id -> Text,
        pack_size -> Nullable<Double>,
        manufacturer_link_id -> Nullable<Text>,
        store_id -> Text,
        user_id -> Text,
        created_datetime -> Timestamp,
        updated_datetime -> Timestamp,
    }
}

table! {
    stock_line (id) {
        id -> Text,
        barcode -> Nullable<Text>,
    }
}

table! {
    store (id) {
        id -> Text,
        site_id -> Integer,
    }
}

table! {
    key_value_store (id) {
        id -> Text,
        value_int -> Nullable<Integer>,
    }
}

#[derive(Queryable)]
struct OldBarcodeRow {
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

                ALTER TABLE packaging_variant ADD COLUMN barcode TEXT;
                CREATE INDEX index_packaging_variant_barcode ON packaging_variant (barcode);

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

        // 2. Every old barcode becomes a proposal from the first store on this site.
        let site_id: Option<i32> = key_value_store::table
            .filter(key_value_store::id.eq("SETTINGS_SYNC_SITE_ID"))
            .select(key_value_store::value_int)
            .first::<Option<i32>>(connection.lock().connection())
            .optional()?
            .flatten();
        let store_id: Option<String> = match site_id {
            Some(site_id) => store::table
                .filter(store::site_id.eq(site_id))
                .select(store::id)
                .order(store::id.asc())
                .first(connection.lock().connection())
                .optional()?,
            None => None,
        };

        if let (Some(site_id), Some(store_id)) = (site_id, store_id) {
            let old_rows: Vec<OldBarcodeRow> = barcode::table
                .select((
                    barcode::gtin,
                    barcode::item_id,
                    barcode::pack_size,
                    barcode::manufacturer_link_id,
                ))
                .order(barcode::id.asc())
                .load(connection.lock().connection())?;

            let now = Utc::now().naive_utc();
            let mut seen: HashSet<(String, String)> = HashSet::new();
            for row in old_rows {
                // The old table allowed any text; a blank one can't be a barcode.
                let Some(normalised) = normalise_barcode(&row.gtin) else {
                    continue;
                };
                let value = normalised.id();
                // item_link.id == item.id by convention, and nothing was merged through
                // the old item_id column
                if !seen.insert((value.clone(), row.item_id.clone())) {
                    continue;
                }
                // A new id: other sites propose the same barcodes, and their
                // proposals all reach central
                let id = uuid();
                diesel::insert_into(barcode_proposal::table)
                    .values((
                        barcode_proposal::id.eq(&id),
                        barcode_proposal::value.eq(&value),
                        barcode_proposal::item_link_id.eq(&row.item_id),
                        barcode_proposal::pack_size.eq(row.pack_size),
                        barcode_proposal::manufacturer_link_id.eq(&row.manufacturer_link_id),
                        barcode_proposal::store_id.eq(&store_id),
                        barcode_proposal::user_id.eq(SYSTEM_USER_ID),
                        barcode_proposal::created_datetime.eq(now),
                        barcode_proposal::updated_datetime.eq(now),
                    ))
                    .execute(connection.lock().connection())?;
                sql!(
                    connection,
                    r#"
                        INSERT INTO changelog (table_name, record_id, row_action, source_site_id, store_id)
                        VALUES ('barcode_proposal', '{id}', 'UPSERT', {site_id}, '{store_id}');
                    "#,
                    store_id = store_id.replace('\'', "''")
                )?;
            }
        }

        sql!(
            connection,
            r#"
                DELETE FROM changelog WHERE table_name = 'barcode';
                DROP TABLE barcode;
            "#
        )?;

        // 3. Stock line barcodes in standard form, one update per distinct barcode.
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
