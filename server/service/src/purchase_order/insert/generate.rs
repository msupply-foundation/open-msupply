use chrono::Utc;
use repository::{
    NumberRowType, PurchaseOrderRow, PurchaseOrderStatus, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertPurchaseOrderInput;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    input: InsertPurchaseOrderInput,
) -> Result<PurchaseOrderRow, RepositoryError> {
    let purchase_order_number = next_number(connection, &NumberRowType::PurchaseOrder, store_id)?;
    let created_datetime = Utc::now().naive_utc();

    Ok(PurchaseOrderRow {
        id: input.id,
        store_id: store_id.to_string(),
        created_by: Some(user_id.to_string()),
        supplier_name_link_id: input.supplier_id,
        purchase_order_number,
        created_datetime,
        status: PurchaseOrderStatus::New,
        // Default
        confirmed_datetime: None,
        target_months: None,
        comment: None,
        donor_link_id: None,
        reference: None,
        currency_id: None,
        foreign_exchange_rate: None,
        shipping_method: None,
        sent_datetime: None,
        contract_signed_date: None,
        advance_paid_date: None,
        received_at_port_date: None,
        requested_delivery_date: None,
        supplier_agent: None,
        authorising_officer_1: None,
        authorising_officer_2: None,
        additional_instructions: None,
        heading_message: None,
        agent_commission: None,
        document_charge: None,
        communications_charge: None,
        insurance_charge: None,
        freight_charge: None,
        freight_conditions: None,
        supplier_discount_percentage: None,
        authorised_datetime: None,
        finalised_datetime: None,
    })
}
