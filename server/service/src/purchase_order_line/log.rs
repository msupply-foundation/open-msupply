use chrono::NaiveDate;
use repository::{
    ItemRowRepository, NameRowRepository, PurchaseOrderLineRow, PurchaseOrderLineStatus,
    RepositoryError, StorageConnection,
};
use serde::Serialize;

/// Keys are the front end's `label.*` locale keys, which is how the shared Log tab names each field.
#[derive(Serialize)]
#[serde(rename_all = "kebab-case")]
pub struct LineLogDetail {
    #[serde(skip_serializing_if = "Option::is_none")]
    item_code: Option<String>,
    item_name: String,
    status: PurchaseOrderLineStatus,
    pack_size: f64,
    requested_units: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    adjusted_units: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    requested_delivery_date: Option<NaiveDate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    expected_delivery_date: Option<NaiveDate>,
    price_per_pack_before_discount: f64,
    price_per_pack_after_discount: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    supplier_item_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    unit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    manufacturer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    comment: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    note: Option<String>,
}

/// Written on every update entry, changed or not; not the line number, which a deletion reassigns.
pub const LINE_IDENTITY_KEYS: &[&str] = &["item-code", "item-name"];

pub fn item_code(
    connection: &StorageConnection,
    item_id: &str,
) -> Result<Option<String>, RepositoryError> {
    Ok(ItemRowRepository::new(connection)
        .find_one_by_id(item_id)?
        .map(|item| item.code))
}

pub fn line_log_detail(
    connection: &StorageConnection,
    line: &PurchaseOrderLineRow,
    item_code: Option<String>,
) -> Result<LineLogDetail, RepositoryError> {
    let manufacturer = match &line.manufacturer_id {
        Some(id) => NameRowRepository::new(connection)
            .find_one_by_id(id)?
            .map(|name| name.name),
        None => None,
    };

    Ok(LineLogDetail {
        item_code,
        item_name: line.item_name.clone(),
        status: line.status.clone(),
        pack_size: line.requested_pack_size,
        requested_units: line.requested_number_of_units,
        adjusted_units: line.adjusted_number_of_units,
        requested_delivery_date: line.requested_delivery_date,
        expected_delivery_date: line.expected_delivery_date,
        price_per_pack_before_discount: line.price_per_pack_before_discount,
        price_per_pack_after_discount: line.price_per_pack_after_discount,
        supplier_item_code: line.supplier_item_code.clone(),
        unit: line.unit.clone(),
        manufacturer,
        comment: line.comment.clone(),
        note: line.note.clone(),
    })
}
