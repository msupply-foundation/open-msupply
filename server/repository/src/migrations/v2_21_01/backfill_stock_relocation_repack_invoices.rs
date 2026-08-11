use crate::migrations::*;
use chrono::{NaiveDate, NaiveDateTime};
use diesel::{prelude::*, sql_query};
use diesel_derive_enum::DbEnum;
use std::collections::HashMap;
use util::uuid::uuid;

// Stock movements that split a stock line (partial moves) were finalised without
// creating any invoice, so neither the reduced source stock line nor the new
// destination stock line shows the movement in the stock ledger, and no location
// movement was recorded for the new line (issue #12488). From 2.21.1 the live code
// creates a repack invoice for each split; this fragment backfills equivalent
// records for splits finalised on 2.21.0.

// Local enums for columns that are postgres enum types. DbEnum maps to the existing
// postgres type whose name is the snake_case of the Rust name; sqlite stores TEXT.
#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceType {
    Repack,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceStatus {
    Verified,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceLineType {
    StockIn,
    StockOut,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "snake_case"]
pub enum ChangelogTableName {
    Invoice,
    InvoiceLine,
    LocationMovement,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RowActionType {
    Upsert,
}

// Minimal local table definitions for the columns written by this migration; all
// omitted NOT NULL columns have database defaults in the 2.21.0 schema.
table! {
    invoice (id) {
        id -> Text,
        name_link_id -> Text,
        store_id -> Text,
        user_id -> Nullable<Text>,
        invoice_number -> BigInt,
        #[sql_name = "type"] type_ -> crate::migrations::v2_21_01::backfill_stock_relocation_repack_invoices::InvoiceTypeMapping,
        status -> crate::migrations::v2_21_01::backfill_stock_relocation_repack_invoices::InvoiceStatusMapping,
        on_hold -> Bool,
        comment -> Nullable<Text>,
        created_datetime -> Timestamp,
        verified_datetime -> Nullable<Timestamp>,
        currency_id -> Nullable<Text>,
        currency_rate -> Double,
    }
}

table! {
    invoice_line (id) {
        id -> Text,
        invoice_id -> Text,
        item_link_id -> Text,
        item_name -> Text,
        item_code -> Text,
        stock_line_id -> Nullable<Text>,
        location_id -> Nullable<Text>,
        batch -> Nullable<Text>,
        expiry_date -> Nullable<Date>,
        pack_size -> Double,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        total_before_tax -> Double,
        total_after_tax -> Double,
        #[sql_name = "type"] type_ -> crate::migrations::v2_21_01::backfill_stock_relocation_repack_invoices::InvoiceLineTypeMapping,
        number_of_packs -> Double,
        volume_per_pack -> Double,
    }
}

table! {
    location_movement (id) {
        id -> Text,
        store_id -> Text,
        stock_line_id -> Text,
        location_id -> Nullable<Text>,
        enter_datetime -> Nullable<Timestamp>,
        exit_datetime -> Nullable<Timestamp>,
    }
}

table! {
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> crate::migrations::v2_21_01::backfill_stock_relocation_repack_invoices::ChangelogTableNameMapping,
        record_id -> Text,
        row_action -> crate::migrations::v2_21_01::backfill_stock_relocation_repack_invoices::RowActionTypeMapping,
        name_link_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
    }
}

table! {
    number (id) {
        id -> Text,
        value -> BigInt,
        store_id -> Text,
        #[sql_name = "type"] type_ -> Text,
    }
}

// One row per historical split. Only relocations of stores active on this site are
// selected: stock_relocation rows sync to central servers, so without the site gate
// both the owning site and central would mint duplicate invoices for the same split.
// The NOT EXISTS guard skips destination stock lines that already have a repack
// StockIn invoice line (created by the live fix or a previous run). It must be
// limited to REPACK invoices: inventory additions and stocktake surpluses also put
// StockIn lines on existing stock lines, and those must not suppress the backfill,
// while live repacks always put their StockIn on a newly created stock line.
//
// Known limitation: this runs once at startup, before sync, so a site freshly
// initialised (or re-initialised) at 2.21.1+ pulls its historical splits from
// central without invoices and they stay un-backfilled - support can re-run the
// backfill by changing the fragment identifier, which is safe under this guard.
const CANDIDATE_SQL: &str = r#"
    SELECT
        sr.store_id AS store_id,
        sr.stock_movement_number AS stock_movement_number,
        sr.created_by AS created_by,
        COALESCE(sr.finalised_datetime, sr.confirmed_datetime, sr.created_datetime) AS finalised_datetime,
        srl.stock_line_id AS source_stock_line_id,
        srl.destination_stock_line_id AS destination_stock_line_id,
        srl.source_location_id AS source_location_id,
        srl.destination_location_id AS destination_location_id,
        srl.number_of_packs AS number_of_packs,
        ssl.id AS source_exists,
        ssl.cost_price_per_pack AS source_cost_price_per_pack,
        ssl.sell_price_per_pack AS source_sell_price_per_pack,
        ssl.pack_size AS source_pack_size,
        ssl.volume_per_pack AS source_volume_per_pack,
        dsl.cost_price_per_pack AS dest_cost_price_per_pack,
        dsl.sell_price_per_pack AS dest_sell_price_per_pack,
        dsl.pack_size AS dest_pack_size,
        dsl.volume_per_pack AS dest_volume_per_pack,
        dsl.batch AS batch,
        dsl.expiry_date AS expiry_date,
        dsl.item_link_id AS item_link_id,
        item.name AS item_name,
        item.code AS item_code
    FROM stock_relocation_line srl
    JOIN stock_relocation sr ON sr.id = srl.stock_relocation_id
    JOIN store s ON s.id = sr.store_id
    JOIN stock_line dsl ON dsl.id = srl.destination_stock_line_id
    JOIN item_link il ON il.id = dsl.item_link_id
    JOIN item ON item.id = il.item_id
    LEFT JOIN stock_line ssl ON ssl.id = srl.stock_line_id
    WHERE sr.status = 'FINALISED'
      AND srl.destination_stock_line_id IS NOT NULL
      AND s.site_id = (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_SITE_ID')
      AND NOT EXISTS (
          SELECT 1 FROM invoice_line il2
          JOIN invoice i2 ON i2.id = il2.invoice_id
          WHERE il2.stock_line_id = srl.destination_stock_line_id
            AND il2.type = 'STOCK_IN'
            AND i2.type = 'REPACK'
      )
    ORDER BY sr.store_id, finalised_datetime, sr.stock_movement_number, srl.id
"#;

#[derive(QueryableByName, Debug)]
struct Candidate {
    #[diesel(sql_type = diesel::sql_types::Text)]
    store_id: String,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    stock_movement_number: i64,
    #[diesel(sql_type = diesel::sql_types::Text)]
    created_by: String,
    #[diesel(sql_type = diesel::sql_types::Timestamp)]
    finalised_datetime: NaiveDateTime,
    #[diesel(sql_type = diesel::sql_types::Text)]
    source_stock_line_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    destination_stock_line_id: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    source_location_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    destination_location_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Double)]
    number_of_packs: f64,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    source_exists: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    source_cost_price_per_pack: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    source_sell_price_per_pack: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    source_pack_size: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
    source_volume_per_pack: Option<f64>,
    #[diesel(sql_type = diesel::sql_types::Double)]
    dest_cost_price_per_pack: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    dest_sell_price_per_pack: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    dest_pack_size: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    dest_volume_per_pack: f64,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    batch: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Date>)]
    expiry_date: Option<NaiveDate>,
    #[diesel(sql_type = diesel::sql_types::Text)]
    item_link_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    item_name: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    item_code: String,
}

#[derive(QueryableByName)]
struct IdRow {
    #[diesel(sql_type = diesel::sql_types::Text)]
    id: String,
}

#[derive(QueryableByName)]
struct StoreMax {
    #[diesel(sql_type = diesel::sql_types::Text)]
    store_id: String,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    max_number: i64,
}

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "backfill_stock_relocation_repack_invoices"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let candidates = sql_query(CANDIDATE_SQL).load::<Candidate>(connection.lock().connection())?;
        if candidates.is_empty() {
            return Ok(());
        }

        // The 'repack' system name is required on the invoice; prefer the name_link
        // whose id equals the name id, matching what the runtime repository writes.
        // If it is missing (only possible on a site that has never synced it, where
        // the repack feature has never worked either) we skip rather than error:
        // a fragment error would stop the server from starting at all.
        let repack_name_link_id = sql_query(
            r#"
            SELECT nl.id AS id FROM name n
            JOIN name_link nl ON nl.name_id = n.id
            WHERE n.code = 'repack'
            ORDER BY CASE WHEN nl.id = n.id THEN 0 ELSE 1 END
            LIMIT 1
            "#,
        )
        .load::<IdRow>(connection.lock().connection())?
        .pop();
        let Some(IdRow {
            id: repack_name_link_id,
        }) = repack_name_link_id
        else {
            log::warn!(
                "v2_21_01 repack backfill: no name with code 'repack' found, skipping backfill of {} stock movement split(s)",
                candidates.len()
            );
            return Ok(());
        };

        let currency_id = sql_query(
            "SELECT id AS id FROM currency WHERE is_home_currency = true AND is_active = true ORDER BY id LIMIT 1",
        )
        .load::<IdRow>(connection.lock().connection())?
        .pop()
        .map(|row| row.id);
        if currency_id.is_none() {
            log::warn!(
                "v2_21_01 repack backfill: no home currency found, invoices created with no currency"
            );
        }

        // Per-store repack invoice numbering: continue above both the highest existing
        // repack invoice number and the number table counter, then bring existing
        // counters up to the allocated max so future live repacks don't collide.
        let mut next_numbers: HashMap<String, i64> = HashMap::new();
        for row in sql_query(
            "SELECT store_id AS store_id, MAX(invoice_number) AS max_number FROM invoice WHERE type = 'REPACK' GROUP BY store_id",
        )
        .load::<StoreMax>(connection.lock().connection())?
        {
            next_numbers.insert(row.store_id, row.max_number);
        }
        let number_rows: Vec<(String, i64)> = number::table
            .filter(number::type_.eq("REPACK"))
            .select((number::store_id, number::value))
            .load(connection.lock().connection())?;
        let stores_with_number_row: Vec<String> =
            number_rows.iter().map(|(store_id, _)| store_id.clone()).collect();
        for (store_id, value) in number_rows {
            let entry = next_numbers.entry(store_id).or_insert(0);
            *entry = (*entry).max(value);
        }

        let candidate_store_ids: std::collections::HashSet<String> = candidates
            .iter()
            .map(|candidate| candidate.store_id.clone())
            .collect();

        let mut created_count = 0;
        for candidate in candidates {
            let next = next_numbers.entry(candidate.store_id.clone()).or_insert(0);
            *next += 1;
            let invoice_number = *next;

            let invoice_id = uuid();
            let comment = format!("Stock movement #{}", candidate.stock_movement_number);

            diesel::insert_into(invoice::table)
                .values((
                    invoice::id.eq(&invoice_id),
                    invoice::name_link_id.eq(&repack_name_link_id),
                    invoice::store_id.eq(&candidate.store_id),
                    invoice::user_id.eq(Some(candidate.created_by.clone())),
                    invoice::invoice_number.eq(invoice_number),
                    invoice::type_.eq(InvoiceType::Repack),
                    invoice::status.eq(InvoiceStatus::Verified),
                    invoice::on_hold.eq(false),
                    invoice::comment.eq(Some(comment)),
                    invoice::created_datetime.eq(candidate.finalised_datetime),
                    invoice::verified_datetime.eq(Some(candidate.finalised_datetime)),
                    invoice::currency_id.eq(currency_id.as_ref()),
                    invoice::currency_rate.eq(1.0),
                ))
                .execute(connection.lock().connection())?;

            // StockIn line for the new (destination) stock line
            let stock_in_id = uuid();
            diesel::insert_into(invoice_line::table)
                .values((
                    invoice_line::id.eq(&stock_in_id),
                    invoice_line::invoice_id.eq(&invoice_id),
                    invoice_line::item_link_id.eq(&candidate.item_link_id),
                    invoice_line::item_name.eq(&candidate.item_name),
                    invoice_line::item_code.eq(&candidate.item_code),
                    invoice_line::stock_line_id.eq(Some(&candidate.destination_stock_line_id)),
                    invoice_line::location_id.eq(candidate.destination_location_id.as_ref()),
                    invoice_line::batch.eq(candidate.batch.as_ref()),
                    invoice_line::expiry_date.eq(candidate.expiry_date),
                    invoice_line::pack_size.eq(candidate.dest_pack_size),
                    invoice_line::cost_price_per_pack.eq(candidate.dest_cost_price_per_pack),
                    invoice_line::sell_price_per_pack.eq(candidate.dest_sell_price_per_pack),
                    invoice_line::total_before_tax
                        .eq(candidate.dest_cost_price_per_pack * candidate.number_of_packs),
                    invoice_line::total_after_tax
                        .eq(candidate.dest_cost_price_per_pack * candidate.number_of_packs),
                    invoice_line::type_.eq(InvoiceLineType::StockIn),
                    invoice_line::number_of_packs.eq(candidate.number_of_packs),
                    invoice_line::volume_per_pack.eq(candidate.dest_volume_per_pack),
                ))
                .execute(connection.lock().connection())?;

            // StockOut line for the source stock line (splits never change pack size,
            // so destination values are an exact fallback if the source was deleted)
            if candidate.source_exists.is_none() {
                log::warn!(
                    "v2_21_01 repack backfill: source stock line {} no longer exists, StockOut line created without stock line link",
                    candidate.source_stock_line_id
                );
            }
            let stock_out_id = uuid();
            let source_stock_line_id = candidate
                .source_exists
                .as_ref()
                .map(|_| &candidate.source_stock_line_id);
            let out_cost = candidate
                .source_cost_price_per_pack
                .unwrap_or(candidate.dest_cost_price_per_pack);
            diesel::insert_into(invoice_line::table)
                .values((
                    invoice_line::id.eq(&stock_out_id),
                    invoice_line::invoice_id.eq(&invoice_id),
                    invoice_line::item_link_id.eq(&candidate.item_link_id),
                    invoice_line::item_name.eq(&candidate.item_name),
                    invoice_line::item_code.eq(&candidate.item_code),
                    invoice_line::stock_line_id.eq(source_stock_line_id),
                    invoice_line::location_id.eq(candidate.source_location_id.as_ref()),
                    invoice_line::batch.eq(candidate.batch.as_ref()),
                    invoice_line::expiry_date.eq(candidate.expiry_date),
                    invoice_line::pack_size
                        .eq(candidate.source_pack_size.unwrap_or(candidate.dest_pack_size)),
                    invoice_line::cost_price_per_pack.eq(out_cost),
                    invoice_line::sell_price_per_pack.eq(candidate
                        .source_sell_price_per_pack
                        .unwrap_or(candidate.dest_sell_price_per_pack)),
                    invoice_line::total_before_tax.eq(out_cost * candidate.number_of_packs),
                    invoice_line::total_after_tax.eq(out_cost * candidate.number_of_packs),
                    invoice_line::type_.eq(InvoiceLineType::StockOut),
                    invoice_line::number_of_packs.eq(candidate.number_of_packs),
                    invoice_line::volume_per_pack.eq(candidate
                        .source_volume_per_pack
                        .unwrap_or(candidate.dest_volume_per_pack)),
                ))
                .execute(connection.lock().connection())?;

            let mut changelog_rows = vec![
                (
                    ChangelogTableName::Invoice,
                    invoice_id.clone(),
                    Some(repack_name_link_id.clone()),
                ),
                (
                    ChangelogTableName::InvoiceLine,
                    stock_in_id,
                    Some(repack_name_link_id.clone()),
                ),
                (
                    ChangelogTableName::InvoiceLine,
                    stock_out_id,
                    Some(repack_name_link_id.clone()),
                ),
            ];

            // Enter-only location movement for the new stock line, as the live repack
            // path creates when a destination location is set
            if candidate.destination_location_id.is_some() {
                let movement_id = uuid();
                diesel::insert_into(location_movement::table)
                    .values((
                        location_movement::id.eq(&movement_id),
                        location_movement::store_id.eq(&candidate.store_id),
                        location_movement::stock_line_id.eq(&candidate.destination_stock_line_id),
                        location_movement::location_id.eq(candidate.destination_location_id.as_ref()),
                        location_movement::enter_datetime.eq(Some(candidate.finalised_datetime)),
                        location_movement::exit_datetime.eq(None::<NaiveDateTime>),
                    ))
                    .execute(connection.lock().connection())?;
                changelog_rows.push((ChangelogTableName::LocationMovement, movement_id, None));
            }

            // Changelog rows are required for the new records to sync: changelog is
            // written by repository code (not triggers), so plain inserts need them
            // added explicitly, mirroring what the runtime repositories write
            for (table_name, record_id, name_link_id) in changelog_rows {
                diesel::insert_into(changelog::table)
                    .values((
                        changelog::table_name.eq(table_name),
                        changelog::record_id.eq(record_id),
                        changelog::row_action.eq(RowActionType::Upsert),
                        changelog::name_link_id.eq(name_link_id),
                        changelog::store_id.eq(Some(candidate.store_id.clone())),
                    ))
                    .execute(connection.lock().connection())?;
            }

            // One line per split so affected records can be traced back from the logs
            log::info!(
                "v2_21_01: backfilled repack invoice {invoice_number} ({invoice_id}) in store {} for stock movement #{}: stock line {} -> {}",
                candidate.store_id,
                candidate.stock_movement_number,
                candidate.source_stock_line_id,
                candidate.destination_stock_line_id
            );

            created_count += 1;
        }

        // Only touch counters of stores that received backfilled invoices - other
        // stores' number rows may be synced copies owned by another site
        for store_id in stores_with_number_row {
            if !candidate_store_ids.contains(&store_id) {
                continue;
            }
            if let Some(new_value) = next_numbers.get(&store_id) {
                diesel::update(number::table)
                    .filter(number::store_id.eq(&store_id))
                    .filter(number::type_.eq("REPACK"))
                    .filter(number::value.lt(new_value))
                    .set(number::value.eq(new_value))
                    .execute(connection.lock().connection())?;
            }
        }

        log::info!(
            "v2_21_01: backfilled {created_count} repack invoice(s) for stock movement splits"
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        migrations::{v2_21_00::V2_21_00, v2_21_01::V2_21_01},
        test_db::*,
    };
    use diesel::RunQueryDsl;

    fn run(connection: &StorageConnection, sql: &str) {
        sql_query(sql)
            .execute(connection.lock().connection())
            .unwrap();
    }

    fn setup_test_data(connection: &StorageConnection) {
        // Names: repack system name (name_link id == name id, as at runtime) + store names
        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('repack', 'FACILITY', false, false, 'repack', 'Repack');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('repack', 'repack');");
        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store1_name', 'FACILITY', true, false, 'STORE1', 'Store One');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('store1_name', 'store1_name');");
        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store2_name', 'FACILITY', true, false, 'STORE2', 'Store Two');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('store2_name', 'store2_name');");

        // store1 is active on this site (site 1); store2 is a synced copy from site 2
        run(connection, "INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store1', 'store1_name', 's1', 1);");
        run(connection, "INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store2', 'store2_name', 's2', 2);");
        run(connection, "INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_SITE_ID', 1);");

        run(connection, "INSERT INTO currency (id, rate, code, is_home_currency, is_active) VALUES ('currency1', 1.0, 'USD', true, true);");

        run(connection, "INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item1', 'Item One', 'ITEM1', 1.0, 'STOCK', '');");
        run(connection, "INSERT INTO item_link (id, item_id) VALUES ('item1', 'item1');");

        run(connection, "INSERT INTO location (id, code, name, on_hold, store_id) VALUES ('loc_src', 'SRC', 'Source', false, 'store1');");
        run(connection, "INSERT INTO location (id, code, name, on_hold, store_id) VALUES ('loc_dst', 'DST', 'Destination', false, 'store1');");

        let stock_line = |id: &str, store: &str, location: &str, packs: f64| {
            format!(
                "INSERT INTO stock_line (id, store_id, item_link_id, location_id, batch, expiry_date, \
                 cost_price_per_pack, sell_price_per_pack, available_number_of_packs, total_number_of_packs, \
                 on_hold, pack_size, volume_per_pack) \
                 VALUES ('{id}', '{store}', 'item1', {location}, 'b1', '2027-01-01', \
                 5.0, 8.0, {packs}, {packs}, false, 2.0, 0.5);"
            )
        };
        run(connection, &stock_line("source_sl", "store1", "'loc_src'", 6.0));
        run(connection, &stock_line("dest_sl", "store1", "'loc_dst'", 4.0));
        run(connection, &stock_line("dest_sl_no_loc", "store1", "NULL", 1.0));
        run(connection, &stock_line("dest_sl_existing", "store1", "'loc_dst'", 1.0));
        run(connection, &stock_line("dest_sl_adjusted", "store1", "'loc_dst'", 2.0));
        run(connection, &stock_line("s2_src", "store2", "NULL", 5.0));
        run(connection, &stock_line("s2_dest", "store2", "NULL", 3.0));

        // Finalised stock movement #7 on store1 with:
        //   srl1 - split into dest_sl (backfilled, with location movement)
        //   srl2 - full move, no destination stock line (skipped)
        //   srl3 - split into dest_sl_no_loc, no destination location (backfilled, no location movement)
        //   srl4 - split into dest_sl_existing which already has a repack StockIn line (skipped)
        //   srl5 - split into dest_sl_adjusted which has a non-repack StockIn from an
        //          inventory addition (still backfilled - the guard is repack-only)
        run(connection, "INSERT INTO stock_relocation (id, store_id, stock_movement_number, status, created_datetime, created_by, confirmed_datetime, finalised_datetime) VALUES ('sr1', 'store1', 7, 'FINALISED', '2026-06-01 09:00:00', 'user1', '2026-06-01 09:30:00', '2026-06-01 10:00:00');");
        run(connection, "INSERT INTO stock_relocation_line (id, stock_relocation_id, stock_line_id, destination_stock_line_id, source_location_id, destination_location_id, number_of_packs) VALUES ('srl1', 'sr1', 'source_sl', 'dest_sl', 'loc_src', 'loc_dst', 4.0);");
        run(connection, "INSERT INTO stock_relocation_line (id, stock_relocation_id, stock_line_id, destination_stock_line_id, source_location_id, destination_location_id, number_of_packs) VALUES ('srl2', 'sr1', 'source_sl', NULL, 'loc_src', 'loc_dst', 2.0);");
        run(connection, "INSERT INTO stock_relocation_line (id, stock_relocation_id, stock_line_id, destination_stock_line_id, source_location_id, destination_location_id, number_of_packs) VALUES ('srl3', 'sr1', 'source_sl', 'dest_sl_no_loc', 'loc_src', NULL, 1.0);");
        run(connection, "INSERT INTO stock_relocation_line (id, stock_relocation_id, stock_line_id, destination_stock_line_id, source_location_id, destination_location_id, number_of_packs) VALUES ('srl4', 'sr1', 'source_sl', 'dest_sl_existing', 'loc_src', 'loc_dst', 1.0);");
        run(connection, "INSERT INTO stock_relocation_line (id, stock_relocation_id, stock_line_id, destination_stock_line_id, source_location_id, destination_location_id, number_of_packs) VALUES ('srl5', 'sr1', 'source_sl', 'dest_sl_adjusted', 'loc_src', 'loc_dst', 2.0);");

        // Inventory addition on dest_sl_adjusted - a non-repack StockIn that must NOT
        // suppress the backfill of srl5
        run(connection, "INSERT INTO invoice (id, name_link_id, store_id, invoice_number, on_hold, created_datetime, type, status, currency_rate, is_cancellation) VALUES ('inv_addition', 'store1_name', 'store1', 1, false, '2026-06-05 00:00:00', 'INVENTORY_ADDITION', 'VERIFIED', 1.0, false);");
        run(connection, "INSERT INTO invoice_line (id, invoice_id, item_link_id, item_name, item_code, type, cost_price_per_pack, sell_price_per_pack, total_before_tax, total_after_tax, number_of_packs, pack_size, stock_line_id) VALUES ('addition_in', 'inv_addition', 'item1', 'Item One', 'ITEM1', 'STOCK_IN', 5.0, 8.0, 10.0, 10.0, 2.0, 2.0, 'dest_sl_adjusted');");

        // Finalised split on store2 - not active on this site, must be skipped
        run(connection, "INSERT INTO stock_relocation (id, store_id, stock_movement_number, status, created_datetime, created_by, confirmed_datetime, finalised_datetime) VALUES ('sr2', 'store2', 1, 'FINALISED', '2026-06-02 09:00:00', 'user2', '2026-06-02 09:30:00', '2026-06-02 10:00:00');");
        run(connection, "INSERT INTO stock_relocation_line (id, stock_relocation_id, stock_line_id, destination_stock_line_id, source_location_id, destination_location_id, number_of_packs) VALUES ('s2_srl', 'sr2', 's2_src', 's2_dest', NULL, NULL, 3.0);");

        // Existing repack invoice #5 (also provides dest_sl_existing's StockIn line)
        // and a number counter at 5 - backfilled invoices must continue from 6
        run(connection, "INSERT INTO invoice (id, name_link_id, store_id, invoice_number, on_hold, created_datetime, type, status, currency_rate, is_cancellation) VALUES ('existing_repack', 'repack', 'store1', 5, false, '2026-05-01 00:00:00', 'REPACK', 'VERIFIED', 1.0, false);");
        run(connection, "INSERT INTO invoice_line (id, invoice_id, item_link_id, item_name, item_code, type, cost_price_per_pack, sell_price_per_pack, total_before_tax, total_after_tax, number_of_packs, pack_size, stock_line_id) VALUES ('existing_in', 'existing_repack', 'item1', 'Item One', 'ITEM1', 'STOCK_IN', 5.0, 8.0, 5.0, 5.0, 1.0, 2.0, 'dest_sl_existing');");
        run(connection, "INSERT INTO number (id, value, store_id, type) VALUES ('num1', 5, 'store1', 'REPACK');");

        // store2's counter lags its max repack invoice number - the migration must
        // NOT touch it (store2 gets no backfilled invoices; its records are synced
        // copies owned by another site)
        run(connection, "INSERT INTO invoice (id, name_link_id, store_id, invoice_number, on_hold, created_datetime, type, status, currency_rate, is_cancellation) VALUES ('s2_repack', 'store2_name', 'store2', 3, false, '2026-05-01 00:00:00', 'REPACK', 'VERIFIED', 1.0, false);");
        run(connection, "INSERT INTO number (id, value, store_id, type) VALUES ('num2', 1, 'store2', 'REPACK');");
    }

    #[actix_rt::test]
    async fn test_backfill_stock_relocation_repack_invoices() {
        let previous_version = V2_21_00.version();
        let version = V2_21_01.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_backfill_relocation_repacks_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        setup_test_data(&connection);

        crate::migrations::migrate(
            &connection,
            Some(version.clone()),
            crate::migrations::MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(crate::migrations::get_database_version(&connection), version);

        let finalised = chrono::NaiveDate::from_ymd_opt(2026, 6, 1)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();

        // Exactly three invoices backfilled (splits srl1, srl3 and srl5), numbered on from 5
        let invoices = invoice::table
            .select((
                invoice::id,
                invoice::name_link_id,
                invoice::store_id,
                invoice::user_id,
                invoice::invoice_number,
                invoice::status,
                invoice::on_hold,
                invoice::comment,
                invoice::created_datetime,
                invoice::verified_datetime,
                invoice::currency_id,
                invoice::currency_rate,
            ))
            .filter(invoice::type_.eq(InvoiceType::Repack))
            .filter(invoice::store_id.eq("store1"))
            .filter(invoice::id.ne("existing_repack"))
            .order_by(invoice::invoice_number.asc())
            .load::<(
                String,
                String,
                String,
                Option<String>,
                i64,
                InvoiceStatus,
                bool,
                Option<String>,
                NaiveDateTime,
                Option<NaiveDateTime>,
                Option<String>,
                f64,
            )>(connection.lock().connection())
            .unwrap();
        assert_eq!(invoices.len(), 3);

        let dest_sl_invoice = &invoices[0];
        assert_eq!(dest_sl_invoice.1, "repack");
        assert_eq!(dest_sl_invoice.2, "store1");
        assert_eq!(dest_sl_invoice.3, Some("user1".to_string()));
        assert_eq!(dest_sl_invoice.4, 6);
        assert_eq!(dest_sl_invoice.5, InvoiceStatus::Verified);
        assert!(!dest_sl_invoice.6);
        assert_eq!(dest_sl_invoice.7, Some("Stock movement #7".to_string()));
        assert_eq!(dest_sl_invoice.8, finalised);
        assert_eq!(dest_sl_invoice.9, Some(finalised));
        assert_eq!(dest_sl_invoice.10, Some("currency1".to_string()));
        assert_eq!(dest_sl_invoice.11, 1.0);
        assert_eq!(invoices[1].4, 7);
        assert_eq!(invoices[2].4, 8);

        // srl5 was backfilled despite the inventory-addition StockIn on its
        // destination line: dest_sl_adjusted now has that addition plus one repack StockIn
        let adjusted_stock_ins = invoice_line::table
            .filter(invoice_line::stock_line_id.eq("dest_sl_adjusted"))
            .filter(invoice_line::type_.eq(InvoiceLineType::StockIn))
            .select(invoice_line::invoice_id)
            .load::<String>(connection.lock().connection())
            .unwrap();
        assert_eq!(adjusted_stock_ins.len(), 2);
        assert!(adjusted_stock_ins.contains(&"inv_addition".to_string()));
        assert!(adjusted_stock_ins.contains(&invoices[2].0));

        // Both invoice lines of the dest_sl invoice
        let lines = invoice_line::table
            .select((
                invoice_line::type_,
                invoice_line::stock_line_id,
                invoice_line::location_id,
                invoice_line::batch,
                invoice_line::expiry_date,
                invoice_line::pack_size,
                invoice_line::cost_price_per_pack,
                invoice_line::sell_price_per_pack,
                invoice_line::total_before_tax,
                invoice_line::total_after_tax,
                invoice_line::number_of_packs,
                invoice_line::volume_per_pack,
                invoice_line::item_link_id,
                invoice_line::item_name,
                invoice_line::item_code,
            ))
            .filter(invoice_line::invoice_id.eq(&dest_sl_invoice.0))
            .load::<(
                InvoiceLineType,
                Option<String>,
                Option<String>,
                Option<String>,
                Option<NaiveDate>,
                f64,
                f64,
                f64,
                f64,
                f64,
                f64,
                f64,
                String,
                String,
                String,
            )>(connection.lock().connection())
            .unwrap();
        assert_eq!(lines.len(), 2);
        let expiry = chrono::NaiveDate::from_ymd_opt(2027, 1, 1);
        let stock_in = lines.iter().find(|l| l.0 == InvoiceLineType::StockIn).unwrap();
        assert_eq!(stock_in.1, Some("dest_sl".to_string()));
        assert_eq!(stock_in.2, Some("loc_dst".to_string()));
        assert_eq!(stock_in.3, Some("b1".to_string()));
        assert_eq!(stock_in.4, expiry);
        assert_eq!(stock_in.5, 2.0);
        assert_eq!(stock_in.6, 5.0);
        assert_eq!(stock_in.7, 8.0);
        assert_eq!(stock_in.8, 20.0);
        assert_eq!(stock_in.9, 20.0);
        assert_eq!(stock_in.10, 4.0);
        assert_eq!(stock_in.11, 0.5);
        assert_eq!(stock_in.12, "item1");
        assert_eq!(stock_in.13, "Item One");
        assert_eq!(stock_in.14, "ITEM1");
        let stock_out = lines.iter().find(|l| l.0 == InvoiceLineType::StockOut).unwrap();
        assert_eq!(stock_out.1, Some("source_sl".to_string()));
        assert_eq!(stock_out.2, Some("loc_src".to_string()));
        assert_eq!(stock_out.5, 2.0);
        assert_eq!(stock_out.8, 20.0);
        assert_eq!(stock_out.10, 4.0);

        // Location movements created only for splits with a destination location
        // (dest_sl and dest_sl_adjusted; not dest_sl_no_loc)
        let movements = location_movement::table
            .select((
                location_movement::stock_line_id,
                location_movement::store_id,
                location_movement::location_id,
                location_movement::enter_datetime,
                location_movement::exit_datetime,
            ))
            .load::<(String, String, Option<String>, Option<NaiveDateTime>, Option<NaiveDateTime>)>(
                connection.lock().connection(),
            )
            .unwrap();
        assert_eq!(movements.len(), 2);
        let dest_sl_movement = movements.iter().find(|m| m.0 == "dest_sl").unwrap();
        assert_eq!(dest_sl_movement.1, "store1");
        assert_eq!(dest_sl_movement.2, Some("loc_dst".to_string()));
        assert_eq!(dest_sl_movement.3, Some(finalised));
        assert_eq!(dest_sl_movement.4, None);
        assert!(movements.iter().any(|m| m.0 == "dest_sl_adjusted"));

        // Changelog rows created for everything that must sync
        let changelog_rows = changelog::table
            .select((changelog::table_name, changelog::record_id, changelog::name_link_id, changelog::store_id))
            .load::<(ChangelogTableName, String, Option<String>, Option<String>)>(
                connection.lock().connection(),
            )
            .unwrap();
        let count = |table_name: ChangelogTableName| {
            changelog_rows.iter().filter(|r| r.0 == table_name).count()
        };
        assert_eq!(count(ChangelogTableName::Invoice), 3);
        assert_eq!(count(ChangelogTableName::InvoiceLine), 6);
        assert_eq!(count(ChangelogTableName::LocationMovement), 2);
        let invoice_changelog = changelog_rows
            .iter()
            .find(|r| r.0 == ChangelogTableName::Invoice && r.1 == dest_sl_invoice.0)
            .unwrap();
        assert_eq!(invoice_changelog.2, Some("repack".to_string()));
        assert_eq!(invoice_changelog.3, Some("store1".to_string()));
        let movement_changelog = changelog_rows
            .iter()
            .find(|r| r.0 == ChangelogTableName::LocationMovement)
            .unwrap();
        assert_eq!(movement_changelog.2, None);
        assert_eq!(movement_changelog.3, Some("store1".to_string()));

        // Number counter brought up to the allocated max
        let number_value = number::table
            .filter(number::store_id.eq("store1"))
            .filter(number::type_.eq("REPACK"))
            .select(number::value)
            .first::<i64>(connection.lock().connection())
            .unwrap();
        assert_eq!(number_value, 8);

        // store2 received no backfilled invoices, so its (lagging) counter is untouched
        let store2_number_value = number::table
            .filter(number::store_id.eq("store2"))
            .filter(number::type_.eq("REPACK"))
            .select(number::value)
            .first::<i64>(connection.lock().connection())
            .unwrap();
        assert_eq!(store2_number_value, 1);

        // Negatives: store2's split skipped (site gate), dest_sl_existing untouched
        let s2_lines = invoice_line::table
            .filter(invoice_line::stock_line_id.eq("s2_dest"))
            .select(invoice_line::id)
            .load::<String>(connection.lock().connection())
            .unwrap();
        assert_eq!(s2_lines.len(), 0);
        let existing_lines = invoice_line::table
            .filter(invoice_line::stock_line_id.eq("dest_sl_existing"))
            .select(invoice_line::id)
            .load::<String>(connection.lock().connection())
            .unwrap();
        assert_eq!(existing_lines, vec!["existing_in".to_string()]);
    }
}
