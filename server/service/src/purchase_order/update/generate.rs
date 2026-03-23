use super::UpdatePurchaseOrderInput;
use crate::nullable_update;
use chrono::{NaiveDate, Utc};
use repository::{
    EqualFilter, PurchaseOrderLineFilter, PurchaseOrderLineRepository, PurchaseOrderLineRow,
    StorageConnection,
};
use repository::{PurchaseOrder, PurchaseOrderRow, PurchaseOrderStatus, RepositoryError};

pub(crate) struct GenerateResult {
    pub updated_order: PurchaseOrderRow,
    pub updated_lines: Vec<PurchaseOrderLineRow>,
}

pub fn generate(
    connection: &StorageConnection,
    purchase_order: PurchaseOrder,
    UpdatePurchaseOrderInput {
        id: _,
        supplier_id,
        status,
        confirmed_datetime,
        comment,
        supplier_discount_percentage,
        supplier_discount_amount,
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
        supplier_agent,
        authorising_officer_1,
        authorising_officer_2,
        additional_instructions,
        heading_message,
        agent_commission,
        document_charge,
        communications_charge,
        insurance_charge,
        freight_charge,
        freight_conditions,
    }: UpdatePurchaseOrderInput,
) -> Result<GenerateResult, RepositoryError> {
    let mut updated_order = purchase_order.purchase_order_row.clone();
    let purchase_order_stats = purchase_order.purchase_order_stats_row;

    set_new_status_datetime(&mut updated_order, status.clone());

    updated_order.supplier_name_id =
        supplier_id.unwrap_or(updated_order.supplier_name_id);
    updated_order.donor_id = donor_id
        .map(|d| d.value)
        .unwrap_or(updated_order.donor_id);
    updated_order.status = status.clone().unwrap_or(updated_order.status);

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
        foreign_exchange_rate.unwrap_or(updated_order.foreign_exchange_rate);
    updated_order.shipping_method = shipping_method.or(updated_order.shipping_method);
    updated_order.reference = reference.or(updated_order.reference);
    updated_order.comment = comment.or(updated_order.comment);

    updated_order.authorising_officer_1 =
        authorising_officer_1.or(updated_order.authorising_officer_1);
    updated_order.authorising_officer_2 =
        authorising_officer_2.or(updated_order.authorising_officer_2);
    updated_order.additional_instructions =
        additional_instructions.or(updated_order.additional_instructions);

    updated_order.supplier_agent = supplier_agent.or(updated_order.supplier_agent);
    updated_order.heading_message = heading_message.or(updated_order.heading_message);
    updated_order.freight_conditions = freight_conditions.or(updated_order.freight_conditions);

    updated_order.agent_commission = agent_commission.or(updated_order.agent_commission);
    updated_order.document_charge = document_charge.or(updated_order.document_charge);
    updated_order.communications_charge =
        communications_charge.or(updated_order.communications_charge);
    updated_order.insurance_charge = insurance_charge.or(updated_order.insurance_charge);
    updated_order.freight_charge = freight_charge.or(updated_order.freight_charge);

    let supplier_discount_percentage = supplier_discount_percentage
        .or(purchase_order
            .purchase_order_row
            .supplier_discount_percentage)
        .unwrap_or(0.0);

    updated_order.supplier_discount_percentage = Some(supplier_discount_percentage);

    if let Some(supplier_discount_amount) = supplier_discount_amount {
        let total_before_tax = purchase_order_stats
            .as_ref()
            .map(|stats| stats.order_total_before_discount)
            .unwrap_or(0.0);

        updated_order.supplier_discount_percentage = if total_before_tax > 0.0 {
            Some((supplier_discount_amount / total_before_tax) * 100.0)
        } else {
            Some(0.0)
        };
    }

    let requested_delivery_date_value = nullable_update(
        &requested_delivery_date,
        updated_order.requested_delivery_date,
    );

    let updated_lines = update_lines(
        connection,
        &updated_order.id,
        &status,
        requested_delivery_date_value,
    )?;

    Ok(GenerateResult {
        updated_order,
        updated_lines,
    })
}

fn set_new_status_datetime(
    purchase_order: &mut PurchaseOrderRow,
    input_status: Option<PurchaseOrderStatus>,
) {
    let new_status = match status_changed(input_status, &purchase_order.status) {
        Some(status) => status,
        None => return,
    };

    let current_datetime = Utc::now().naive_utc();

    match new_status {
        PurchaseOrderStatus::RequestApproval => {
            purchase_order.request_approval_datetime = Some(current_datetime);
        }
        PurchaseOrderStatus::Confirmed => {
            purchase_order.confirmed_datetime = Some(current_datetime);
        }
        PurchaseOrderStatus::Sent => {
            purchase_order.sent_datetime = Some(current_datetime);
        }
        PurchaseOrderStatus::Finalised => {
            purchase_order.finalised_datetime = Some(current_datetime)
        }
        PurchaseOrderStatus::New => {}
    }
}

fn status_changed(
    status: Option<PurchaseOrderStatus>,
    current_status: &PurchaseOrderStatus,
) -> Option<PurchaseOrderStatus> {
    match status {
        Some(new_status) if &new_status != current_status => Some(new_status),
        _ => None,
    }
}

fn update_lines(
    connection: &StorageConnection,
    purchase_order_id: &str,
    status: &Option<PurchaseOrderStatus>,
    requested_delivery_date: Option<NaiveDate>,
) -> Result<Vec<PurchaseOrderLineRow>, RepositoryError> {
    if let Some(new_status) = status {
        let lines = PurchaseOrderLineRepository::new(connection).query_by_filter(
            PurchaseOrderLineFilter::new()
                .purchase_order_id(EqualFilter::equal_to(purchase_order_id.to_string())),
        )?;

        let updated_lines: Vec<PurchaseOrderLineRow> = lines
            .into_iter()
            .map(|mut line| {
                match new_status {
                    PurchaseOrderStatus::Confirmed => {
                        line.purchase_order_line_row.requested_delivery_date = line
                            .purchase_order_line_row
                            .requested_delivery_date
                            .or(requested_delivery_date);
                    }
                    PurchaseOrderStatus::Sent => {
                        if line.purchase_order_line_row.status
                            != repository::PurchaseOrderLineStatus::Closed
                        {
                            line.purchase_order_line_row.status =
                                repository::PurchaseOrderLineStatus::Sent;
                        }
                    }
                    PurchaseOrderStatus::Finalised => {
                        line.purchase_order_line_row.status =
                            repository::PurchaseOrderLineStatus::Closed;
                    }
                    _ => {}
                }
                line.purchase_order_line_row.clone()
            })
            .collect();
        Ok(updated_lines)
    } else {
        Ok(vec![])
    }
}
