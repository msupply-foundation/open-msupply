use crate::migrations::*;
use chrono::Utc;
use diesel::prelude::*;
use util::{constants::SYSTEM_USER_ID, uuid::uuid};

/// Confirmed barcodes move onto packaging variants
/// (decisions/2026-09-30_barcodes.md, Option 6):
///
/// - `packaging_variant.barcode` holds a confirmed barcode, in the same standard
///   form as `barcode_proposal.value`.
/// - Every barcode this site has becomes a proposal from a store on this site, so
///   it syncs up to central. Barcodes from legacy mSupply reached every site, so
///   several sites propose them and central confirms them without review; the
///   rest wait for review. A site with no store of its own proposes nothing.
/// - `barcode` is dropped, along with its changelog entries.
pub(crate) struct Migrate;

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
struct BarcodeRow {
    value: String,
    item_link_id: String,
    pack_size: Option<f64>,
    manufacturer_link_id: Option<String>,
}

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "barcodes_on_packaging_variants"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE packaging_variant ADD COLUMN barcode TEXT;
                CREATE INDEX index_packaging_variant_barcode ON packaging_variant (barcode);
            "#
        )?;

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
            let barcodes: Vec<BarcodeRow> = barcode::table
                .filter(barcode::deleted_datetime.is_null())
                .select((
                    barcode::value,
                    barcode::item_link_id,
                    barcode::pack_size,
                    barcode::manufacturer_link_id,
                ))
                .order(barcode::id.asc())
                .load(connection.lock().connection())?;

            let now = Utc::now().naive_utc();
            for barcode in barcodes {
                // A new id: other sites propose the same barcodes, and their
                // proposals all reach central
                let id = uuid();
                diesel::insert_into(barcode_proposal::table)
                    .values((
                        barcode_proposal::id.eq(&id),
                        barcode_proposal::value.eq(&barcode.value),
                        barcode_proposal::item_link_id.eq(&barcode.item_link_id),
                        barcode_proposal::pack_size.eq(barcode.pack_size),
                        barcode_proposal::manufacturer_link_id.eq(&barcode.manufacturer_link_id),
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

        Ok(())
    }
}
