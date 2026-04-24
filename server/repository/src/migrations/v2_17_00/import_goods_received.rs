use crate::migrations::*;
use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::Deserialize;
use util::sync_serde::{empty_str_as_option_string, zero_date_as_option};

pub(crate) struct Migrate;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncAction {
    Upsert,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceType {
    InboundShipment,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceStatus {
    New,
    Verified,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceLineType {
    StockIn,
}

table! {
    sync_buffer (record_id) {
        record_id -> Text,
        data -> Text,
        action -> crate::migrations::v2_17_00::import_goods_received::SyncActionMapping,
        table_name -> Text,
        integration_error -> Nullable<Text>,
    }
}

table! {
    purchase_order (id) {
        id -> Text,
        supplier_name_link_id -> Text,
        currency_id -> Nullable<Text>,
        foreign_exchange_rate -> Double,
    }
}

table! {
    item_link (id) {
        id -> Text,
        item_id -> Text,
    }
}

table! {
    item (id) {
        id -> Text,
        code -> Text,
    }
}

table! {
    invoice (id) {
        id -> Text,
        name_link_id -> Text,
        name_store_id -> Nullable<Text>,
        store_id -> Text,
        user_id -> Nullable<Text>,
        invoice_number -> BigInt,
        #[sql_name = "type"] type_ -> crate::migrations::v2_17_00::import_goods_received::InvoiceTypeMapping,
        status -> crate::migrations::v2_17_00::import_goods_received::InvoiceStatusMapping,
        on_hold -> Bool,
        comment -> Nullable<Text>,
        their_reference -> Nullable<Text>,
        transport_reference -> Nullable<Text>,
        created_datetime -> Timestamp,
        allocated_datetime -> Nullable<Timestamp>,
        picked_datetime -> Nullable<Timestamp>,
        shipped_datetime -> Nullable<Timestamp>,
        delivered_datetime -> Nullable<Timestamp>,
        received_datetime -> Nullable<Timestamp>,
        verified_datetime -> Nullable<Timestamp>,
        cancelled_datetime -> Nullable<Timestamp>,
        colour -> Nullable<Text>,
        requisition_id -> Nullable<Text>,
        linked_invoice_id -> Nullable<Text>,
        tax_percentage -> Nullable<Double>,
        currency_id -> Nullable<Text>,
        currency_rate -> Double,
        clinician_link_id -> Nullable<Text>,
        original_shipment_id -> Nullable<Text>,
        backdated_datetime -> Nullable<Timestamp>,
        diagnosis_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
        name_insurance_join_id -> Nullable<Text>,
        insurance_discount_amount -> Nullable<Double>,
        insurance_discount_percentage -> Nullable<Double>,
        is_cancellation -> Bool,
        expected_delivery_date -> Nullable<Date>,
        default_donor_link_id -> Nullable<Text>,
        purchase_order_id -> Nullable<Text>,
        shipping_method_id -> Nullable<Text>,
    }
}

// The actual invoice_line SQL table (not the view)
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
        tax_percentage -> Nullable<Double>,
        #[sql_name = "type"] type_ -> crate::migrations::v2_17_00::import_goods_received::InvoiceLineTypeMapping,
        number_of_packs -> Double,
        note -> Nullable<Text>,
        volume_per_pack -> Double,
    }
}

joinable!(item_link -> item (item_id));
allow_tables_to_appear_in_same_query!(item_link, item);

// --- Legacy structs ---

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyGoodsReceivedRow {
    #[serde(rename = "ID")]
    id: String,
    store_ID: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    purchase_order_ID: Option<String>,
    serial_number: i64,
    status: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    supplier_reference: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    user_id_created: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    linked_transaction_ID: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    entry_date: Option<NaiveDate>,
    #[serde(deserialize_with = "zero_date_as_option")]
    received_date: Option<NaiveDate>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    donor_id: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyGoodsReceivedLineRow {
    #[serde(rename = "ID")]
    id: String,
    goods_received_ID: String,
    item_ID: String,
    item_name: String,
    pack_received: f64,
    quantity_received: f64,
    cost_price: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    batch_received: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    expiry_date: Option<NaiveDate>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    location_ID: Option<String>,
    volume_per_pack: f64,
}

// --- Insertable structs ---

#[derive(Insertable)]
#[diesel(table_name = invoice)]
struct NewInvoiceRow {
    id: String,
    name_link_id: String,
    store_id: String,
    user_id: Option<String>,
    invoice_number: i64,
    type_: InvoiceType,
    status: InvoiceStatus,
    on_hold: bool,
    comment: Option<String>,
    their_reference: Option<String>,
    created_datetime: NaiveDateTime,
    received_datetime: Option<NaiveDateTime>,
    linked_invoice_id: Option<String>,
    currency_id: Option<String>,
    currency_rate: f64,
    is_cancellation: bool,
    purchase_order_id: Option<String>,
    default_donor_link_id: Option<String>,
}

#[derive(Insertable)]
#[diesel(table_name = invoice_line)]
struct NewInvoiceLineRow {
    id: String,
    invoice_id: String,
    item_link_id: String,
    item_name: String,
    item_code: String,
    location_id: Option<String>,
    batch: Option<String>,
    expiry_date: Option<NaiveDate>,
    pack_size: f64,
    cost_price_per_pack: f64,
    sell_price_per_pack: f64,
    total_before_tax: f64,
    total_after_tax: f64,
    type_: InvoiceLineType,
    number_of_packs: f64,
    note: Option<String>,
    volume_per_pack: f64,
}

// --- Helpers ---

fn map_status(status: &str) -> InvoiceStatus {
    match status {
        "New" | "nw" => InvoiceStatus::New,
        "fn" | "Fin" | "Finalised" => InvoiceStatus::Verified,
        other => {
            log::warn!("unknown goods_received status '{other}', defaulting to NEW");
            InvoiceStatus::New
        }
    }
}

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "import_goods_received"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        import_invoices(connection)?;
        import_invoice_lines(connection)?;
        Ok(())
    }
}

fn import_invoices(connection: &StorageConnection) -> anyhow::Result<()> {
    let rows = sync_buffer::table
        .select((sync_buffer::record_id, sync_buffer::data))
        .filter(
            sync_buffer::action
                .eq(SyncAction::Upsert)
                .and(sync_buffer::table_name.eq("Goods_received")),
        )
        .load::<(String, String)>(connection.lock().connection())?;

    for (record_id, data) in rows {
        let legacy_row = match serde_json::from_str::<LegacyGoodsReceivedRow>(&data) {
            Ok(row) => row,
            Err(e) => {
                diesel::update(sync_buffer::table)
                    .filter(sync_buffer::record_id.eq(&record_id))
                    .set(sync_buffer::integration_error.eq(e.to_string()))
                    .execute(connection.lock().connection())?;
                log::warn!("Could not parse goods_received sync buffer row {record_id}: {e}");
                continue;
            }
        };

        let (name_link_id, currency_id, currency_rate) = match &legacy_row.purchase_order_ID {
            None => {
                log::warn!("goods_received {record_id} has no purchase_order_ID, skipping");
                continue;
            }
            Some(po_id) => {
                match purchase_order::table
                    .select((
                        purchase_order::supplier_name_link_id,
                        purchase_order::currency_id,
                        purchase_order::foreign_exchange_rate,
                    ))
                    .filter(purchase_order::id.eq(po_id))
                    .first::<(String, Option<String>, f64)>(connection.lock().connection())
                    .optional()?
                {
                    Some(result) => result,
                    None => {
                        log::warn!(
                            "purchase_order {po_id} not found for goods_received {record_id}, skipping"
                        );
                        continue;
                    }
                }
            }
        };

        let created_datetime = legacy_row
            .entry_date
            .and_then(|d| d.and_hms_opt(0, 0, 0))
            .unwrap_or_else(|| {
                log::warn!("missing entry_date for goods_received {record_id}, using current time");
                chrono::Utc::now().naive_utc()
            });

        let new_row = NewInvoiceRow {
            id: legacy_row.id,
            name_link_id,
            store_id: legacy_row.store_ID,
            user_id: legacy_row.user_id_created,
            invoice_number: legacy_row.serial_number,
            type_: InvoiceType::InboundShipment,
            status: map_status(&legacy_row.status),
            on_hold: false,
            comment: legacy_row.comment,
            their_reference: legacy_row.supplier_reference,
            created_datetime,
            received_datetime: legacy_row
                .received_date
                .and_then(|d| d.and_hms_opt(0, 0, 0)),
            linked_invoice_id: legacy_row.linked_transaction_ID,
            currency_id,
            currency_rate,
            is_cancellation: false,
            purchase_order_id: legacy_row.purchase_order_ID,
            default_donor_link_id: legacy_row.donor_id,
        };

        diesel::insert_into(invoice::table)
            .values(&new_row)
            .execute(connection.lock().connection())?;
    }

    Ok(())
}

fn import_invoice_lines(connection: &StorageConnection) -> anyhow::Result<()> {
    let rows = sync_buffer::table
        .select((sync_buffer::record_id, sync_buffer::data))
        .filter(
            sync_buffer::action
                .eq(SyncAction::Upsert)
                .and(sync_buffer::table_name.eq("Goods_received_line")),
        )
        .load::<(String, String)>(connection.lock().connection())?;

    for (record_id, data) in rows {
        let legacy_row = match serde_json::from_str::<LegacyGoodsReceivedLineRow>(&data) {
            Ok(row) => row,
            Err(e) => {
                diesel::update(sync_buffer::table)
                    .filter(sync_buffer::record_id.eq(&record_id))
                    .set(sync_buffer::integration_error.eq(e.to_string()))
                    .execute(connection.lock().connection())?;
                log::warn!("Could not parse goods_received_line sync buffer row {record_id}: {e}");
                continue;
            }
        };

        // Look up item_link_id and item_code via item_ID
        let item_lookup = item_link::table
            .inner_join(item::table.on(item::id.eq(item_link::item_id)))
            .select((item_link::id, item::code))
            .filter(item_link::item_id.eq(&legacy_row.item_ID))
            .first::<(String, String)>(connection.lock().connection())
            .optional()?;

        let (item_link_id, item_code) = match item_lookup {
            Some(result) => result,
            None => {
                log::warn!(
                    "item {} not found for goods_received_line {record_id}, skipping",
                    legacy_row.item_ID
                );
                continue;
            }
        };

        let new_row = NewInvoiceLineRow {
            id: legacy_row.id,
            invoice_id: legacy_row.goods_received_ID,
            item_link_id,
            item_name: legacy_row.item_name,
            item_code,
            location_id: legacy_row.location_ID,
            batch: legacy_row.batch_received,
            expiry_date: legacy_row.expiry_date,
            pack_size: legacy_row.pack_received,
            cost_price_per_pack: legacy_row.cost_price,
            sell_price_per_pack: legacy_row.cost_price, // We don't have sell price data, so just copy cost price
            total_before_tax: legacy_row.cost_price * legacy_row.quantity_received,
            total_after_tax: legacy_row.cost_price * legacy_row.quantity_received, // Assuming no tax data, so total after tax is same as before tax
            type_: InvoiceLineType::StockIn,
            number_of_packs: legacy_row.quantity_received,
            note: legacy_row.comment,
            volume_per_pack: legacy_row.volume_per_pack,
        };

        diesel::insert_into(invoice_line::table)
            .values(&new_row)
            .execute(connection.lock().connection())?;
    }

    Ok(())
}
