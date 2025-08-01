use repository::{PurchaseOrderRow, RepositoryError};

use super::UpdatePurchaseOrderInput;

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
    let supplier_name_link_id = supplier_id.unwrap_or(purchase_order.supplier_name_link_id);
    let donor_link_id = donor_id
        .map(|d| d.value)
        .unwrap_or(purchase_order.donor_link_id);

    let status = status.unwrap_or(purchase_order.status);

    let confirmed_datetime =
        nullable_update(&confirmed_datetime, purchase_order.confirmed_datetime);
    let sent_datetime = nullable_update(&sent_datetime, purchase_order.sent_datetime);
    let contract_signed_date =
        nullable_update(&contract_signed_date, purchase_order.contract_signed_date);
    let advance_paid_date = nullable_update(&advance_paid_date, purchase_order.advance_paid_date);
    let received_at_port_date =
        nullable_update(&received_at_port_date, purchase_order.received_at_port_date);
    let requested_delivery_date = nullable_update(
        &requested_delivery_date,
        purchase_order.requested_delivery_date,
    );

    let currency_id = currency_id.or(purchase_order.currency_id);
    let foreign_exchange_rate = foreign_exchange_rate.or(purchase_order.foreign_exchange_rate);

    let shipping_method = shipping_method.or(purchase_order.shipping_method);
    let comment = comment.or(purchase_order.comment);
    let reference = reference.or(purchase_order.reference);

    // Updated through Purchase Order Lines
    let order_total_before_discount = purchase_order.order_total_before_discount;

    let supplier_discount_percentage = supplier_discount_percentage
        .or(purchase_order.supplier_discount_percentage)
        .unwrap_or(0.0);

    let supplier_discount_amount =
        order_total_before_discount * (supplier_discount_percentage / 100.0);
    let order_total_after_discount = order_total_before_discount - supplier_discount_amount;

    Ok(PurchaseOrderRow {
        supplier_name_link_id,
        donor_link_id,
        reference,
        status,
        confirmed_datetime,
        sent_datetime,
        contract_signed_date,
        advance_paid_date,
        received_at_port_date,
        requested_delivery_date,
        supplier_discount_percentage: Some(supplier_discount_percentage),
        supplier_discount_amount,
        currency_id,
        foreign_exchange_rate,
        shipping_method,
        comment,
        order_total_after_discount,
        ..purchase_order
    })
}

fn nullable_update<T: Clone>(
    input: &Option<crate::NullableUpdate<T>>,
    current: Option<T>,
) -> Option<T> {
    match input {
        Some(crate::NullableUpdate { value }) => value.clone(),
        None => current,
    }
}
