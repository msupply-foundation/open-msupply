use super::UpdatePurchaseOrderInput;
use crate::NullableUpdate;
use repository::{PurchaseOrderRow, PurchaseOrderStatus, RepositoryError};

pub fn generate(
    purchase_order: PurchaseOrderRow,
    UpdatePurchaseOrderInput {
        id: _,
        supplier_id,
        status,
        confirmed_datetime,
        comment,
        supplier_discount_percentage,
        donor_id,
        reference,
        currency_id,
        foreign_exchange_rate,
        shipping_method,
        sent_datetime,
        contract_signed_date,
        requested_delivery_date,
        advance_paid_date,
        received_at_port_date,
    }: UpdatePurchaseOrderInput,
) -> Result<PurchaseOrderRow, RepositoryError> {
    let mut updated_order = purchase_order.clone();

    set_new_status_datetime(&mut updated_order, &status);

    updated_order.supplier_name_link_id =
        supplier_id.unwrap_or(updated_order.supplier_name_link_id);
    updated_order.donor_link_id = donor_id
        .map(|d| d.value)
        .unwrap_or(updated_order.donor_link_id);
    updated_order.status = status.unwrap_or(updated_order.status);

    updated_order.confirmed_datetime =
        nullable_update(&confirmed_datetime, updated_order.confirmed_datetime);
    updated_order.sent_datetime = nullable_update(&sent_datetime, updated_order.sent_datetime);
    updated_order.contract_signed_date =
        nullable_update(&contract_signed_date, updated_order.contract_signed_date);
    updated_order.advance_paid_date =
        nullable_update(&advance_paid_date, updated_order.advance_paid_date);
    updated_order.received_at_port_date =
        nullable_update(&received_at_port_date, updated_order.received_at_port_date);
    updated_order.requested_delivery_date = nullable_update(
        &requested_delivery_date,
        updated_order.requested_delivery_date,
    );

    updated_order.currency_id = currency_id.or(updated_order.currency_id);
    updated_order.foreign_exchange_rate =
        foreign_exchange_rate.or(updated_order.foreign_exchange_rate);
    updated_order.shipping_method = shipping_method.or(updated_order.shipping_method);
    updated_order.reference = reference.or(updated_order.reference);
    updated_order.comment = comment.or(updated_order.comment);

    let supplier_discount_percentage = supplier_discount_percentage
        .or(purchase_order.supplier_discount_percentage)
        .unwrap_or(0.0);

    updated_order.supplier_discount_percentage = Some(supplier_discount_percentage);

    Ok(updated_order)
}

fn nullable_update<T: Clone>(input: &Option<NullableUpdate<T>>, current: Option<T>) -> Option<T> {
    match input {
        Some(NullableUpdate { value }) => value.clone(),
        None => current,
    }
}

fn set_new_status_datetime(
    purchase_order: &mut PurchaseOrderRow,
    input_status: &Option<PurchaseOrderStatus>,
) {
    let current_datetime = chrono::Utc::now().naive_utc();
    if let Some(status) = input_status {
        match status {
            PurchaseOrderStatus::Authorised => {
                purchase_order.authorised_datetime = Some(current_datetime);
            }
            PurchaseOrderStatus::Confirmed => {
                purchase_order.confirmed_datetime = Some(current_datetime);
            }
            PurchaseOrderStatus::Finalised => {
                purchase_order.finalised_datetime = Some(current_datetime)
            }
            _ => {}
        }
    }
}
