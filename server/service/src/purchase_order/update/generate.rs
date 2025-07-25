use repository::{PurchaseOrderRow, RepositoryError};

use super::UpdatePurchaseOrderInput;

pub fn generate(
    purchase_order: PurchaseOrderRow,
    input: UpdatePurchaseOrderInput,
) -> Result<PurchaseOrderRow, RepositoryError> {
    let UpdatePurchaseOrderInput {
        supplier_id,
        status,
        confirmed_datetime,
        comment,
        supplier_discount_percentage,
        supplier_discount_amount,
        donor_link_id,
        reference,
        currency_id,
        foreign_exchange_rate,
        shipping_method,
        sent_datetime,
        contract_signed_date,
        advance_paid_date,
        received_at_port_date,
        expected_delivery_date,
        ..
    } = input;

    let supplier_name_link_id = supplier_id.unwrap_or(purchase_order.supplier_name_link_id);
    let donor_link_id = donor_link_id.or(purchase_order.donor_link_id);

    let status = status.unwrap_or(purchase_order.status);

    let confirmed_datetime = confirmed_datetime.or(purchase_order.confirmed_datetime);
    let sent_datetime = sent_datetime.or(purchase_order.sent_datetime);
    let contract_signed_date = contract_signed_date.or(purchase_order.contract_signed_date);
    let advance_paid_date = advance_paid_date.or(purchase_order.advance_paid_date);
    let received_at_port_date = received_at_port_date.or(purchase_order.received_at_port_date);

    let currency_id = currency_id.or(purchase_order.currency_id);
    let foreign_exchange_rate = foreign_exchange_rate.or(purchase_order.foreign_exchange_rate);

    let shipping_method = shipping_method.or(purchase_order.shipping_method);
    let comment = comment.or(purchase_order.comment);
    let reference = reference.or(purchase_order.reference);

    let supplier_discount_amount =
        supplier_discount_amount.unwrap_or(purchase_order.supplier_discount_amount);

    let order_total_before_discount = purchase_order.order_total_before_discount;
    let order_total_after_discount = order_total_before_discount - supplier_discount_amount;

    // Use input percentage if provided, otherwise calculate it
    let supplier_discount_percentage = supplier_discount_percentage.or_else(|| {
        if order_total_before_discount != 0.0 {
            Some((order_total_after_discount / order_total_before_discount) * 100.0)
        } else {
            Some(0.0)
        }
    });

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
        supplier_discount_percentage,
        supplier_discount_amount,
        currency_id,
        foreign_exchange_rate,
        shipping_method,
        comment,
        expected_delivery_date,
        order_total_after_discount,
        ..purchase_order
    })
}
