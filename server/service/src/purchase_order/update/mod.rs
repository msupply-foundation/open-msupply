use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ActivityLogType, EqualFilter, InvoiceFilter, InvoiceRepository, InvoiceStatus, InvoiceType,
    PurchaseOrderLine, PurchaseOrderLineRowRepository, PurchaseOrderRow,
    PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError, StorageConnection,
    TransactionError,
};

use crate::{
    NullableUpdate,
    activity_log::{activity_log_entry, log_type_from_purchase_order_status},
    invoice::inbound_shipment::{
        InboundShipmentType,
        delete::{DeleteInboundShipment, DeleteInboundShipmentError, delete_inbound_shipment},
    },
    purchase_order::update::generate::GenerateResult,
    service_provider::ServiceContext,
};

mod generate;
mod test;
mod validate;

use generate::generate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum UpdatePurchaseOrderError {
    SupplierDoesNotExist,
    PurchaseOrderDoesNotExist,
    UpdatedRecordNotFound,
    NotASupplier,
    DonorDoesNotExist,
    CannotEditSentPurchaseOrder,
    DatabaseError(RepositoryError),
    ItemsCannotBeOrdered(Vec<PurchaseOrderLine>),
    InboundShipmentsNotVerified,
    // Only a SENT order can be cancelled
    CannotCancelPurchaseOrder,
    // A cancelled order never changes state again
    CannotReopenCancelledPurchaseOrder,
    // An inbound shipment against the order has progressed past NEW
    InboundShipmentsInProgress,
    ShipmentDeleteError {
        invoice_id: String,
        error: DeleteInboundShipmentError,
    },
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdatePurchaseOrderInput {
    pub id: String,
    pub supplier_id: Option<String>,
    pub status: Option<PurchaseOrderStatus>,
    pub confirmed_datetime: Option<NullableUpdate<NaiveDateTime>>,
    pub comment: Option<String>,
    pub supplier_discount_percentage: Option<f64>,
    pub supplier_discount_amount: Option<f64>,
    pub donor_id: Option<NullableUpdate<String>>,
    pub reference: Option<String>,
    pub currency_id: Option<String>,
    pub foreign_exchange_rate: Option<f64>,
    pub shipping_method: Option<String>,
    pub sent_datetime: Option<NullableUpdate<NaiveDateTime>>,
    pub contract_signed_date: Option<NullableUpdate<NaiveDate>>,
    pub advance_paid_date: Option<NullableUpdate<NaiveDate>>,
    pub received_at_port_date: Option<NullableUpdate<NaiveDate>>,
    pub requested_delivery_date: Option<NullableUpdate<NaiveDate>>,
    pub supplier_agent: Option<String>,
    pub authorising_officer_1: Option<String>,
    pub authorising_officer_2: Option<String>,
    pub additional_instructions: Option<String>,
    pub heading_message: Option<String>,
    pub agent_commission: Option<f64>,
    pub document_charge: Option<f64>,
    pub communications_charge: Option<f64>,
    pub insurance_charge: Option<f64>,
    pub freight_charge: Option<f64>,
    pub freight_conditions: Option<String>,
}

impl UpdatePurchaseOrderInput {
    pub fn is_allowed_on_closed_order(&self, status: &PurchaseOrderStatus) -> bool {
        let Self {
            id: _,
            status: _,
            comment: _,
            contract_signed_date,
            advance_paid_date,
            supplier_id,
            confirmed_datetime,
            sent_datetime,
            supplier_discount_percentage,
            supplier_discount_amount,
            donor_id,
            reference,
            currency_id,
            foreign_exchange_rate,
            shipping_method,
            received_at_port_date,
            requested_delivery_date,
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
        } = self;
        let post_sending_dates_allowed = matches!(status, PurchaseOrderStatus::Sent)
            || (contract_signed_date.is_none() && advance_paid_date.is_none());
        post_sending_dates_allowed
            && supplier_id.is_none()
            && confirmed_datetime.is_none()
            && sent_datetime.is_none()
            && supplier_discount_percentage.is_none()
            && supplier_discount_amount.is_none()
            && donor_id.is_none()
            && reference.is_none()
            && currency_id.is_none()
            && foreign_exchange_rate.is_none()
            && shipping_method.is_none()
            && received_at_port_date.is_none()
            && requested_delivery_date.is_none()
            && supplier_agent.is_none()
            && authorising_officer_1.is_none()
            && authorising_officer_2.is_none()
            && additional_instructions.is_none()
            && heading_message.is_none()
            && agent_commission.is_none()
            && document_charge.is_none()
            && communications_charge.is_none()
            && insurance_charge.is_none()
            && freight_charge.is_none()
            && freight_conditions.is_none()
    }
}

pub fn update_purchase_order(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdatePurchaseOrderInput,
) -> Result<PurchaseOrderRow, UpdatePurchaseOrderError> {
    let purchase_order = ctx
        .connection
        .transaction_sync(|connection: &repository::StorageConnection| {
            let (purchase_order, next_status) = validate(&input, store_id, connection)?;
            let existing_purchase_order = purchase_order.clone();
            let mut purchase_order_input = input.clone();
            if let Some(new_status) = next_status {
                purchase_order_input.status = Some(new_status);
            }
            let GenerateResult {
                updated_order: updated_purchase_order,
                updated_lines,
            } = generate(connection, purchase_order, purchase_order_input)?;

            let purchase_order_repository = PurchaseOrderRowRepository::new(connection);
            purchase_order_repository.upsert_one(&updated_purchase_order)?;

            if !updated_lines.is_empty() {
                let purchase_order_line_repository =
                    PurchaseOrderLineRowRepository::new(connection);
                for line in &updated_lines {
                    purchase_order_line_repository.upsert_one(line)?;
                }
            }

            // Cancelling removes the shipments still being drafted against the order
            if existing_purchase_order.purchase_order_row.status != PurchaseOrderStatus::Cancelled
                && updated_purchase_order.status == PurchaseOrderStatus::Cancelled
            {
                delete_new_inbound_shipments(ctx, connection, &updated_purchase_order.id)?;
            }

            // Only a status change is logged; an edit to the order's fields leaves no entry
            let previous_status = &existing_purchase_order.purchase_order_row.status;
            if *previous_status != updated_purchase_order.status {
                let activity_type = if *previous_status == PurchaseOrderStatus::Sent
                    && updated_purchase_order.status == PurchaseOrderStatus::Confirmed
                {
                    ActivityLogType::PurchaseOrderStatusChangedFromSentToConfirmed
                } else {
                    log_type_from_purchase_order_status(&updated_purchase_order.status)
                };

                activity_log_entry(
                    ctx,
                    activity_type,
                    Some(updated_purchase_order.id.clone()),
                    None,
                    None,
                )?;
            }

            purchase_order_repository
                .find_one_by_id(&updated_purchase_order.id)?
                .ok_or(UpdatePurchaseOrderError::UpdatedRecordNotFound)
        })
        .map_err(|error: TransactionError<UpdatePurchaseOrderError>| error.to_inner_error())?;

    Ok(purchase_order)
}

fn delete_new_inbound_shipments(
    ctx: &ServiceContext,
    connection: &StorageConnection,
    purchase_order_id: &str,
) -> Result<(), UpdatePurchaseOrderError> {
    let new_shipments = InvoiceRepository::new(connection).query_by_filter(
        InvoiceFilter::new()
            .purchase_order_id(EqualFilter::equal_to(purchase_order_id.to_string()))
            .r#type(EqualFilter::equal_to(InvoiceType::InboundShipment))
            .status(InvoiceStatus::New.equal_to()),
    )?;

    for shipment in new_shipments {
        let invoice_id = shipment.invoice_row.id;
        delete_inbound_shipment(
            ctx,
            DeleteInboundShipment {
                id: invoice_id.clone(),
            },
            InboundShipmentType::InboundShipmentExternal,
        )
        .map_err(|error| UpdatePurchaseOrderError::ShipmentDeleteError { invoice_id, error })?;
    }

    Ok(())
}

impl From<RepositoryError> for UpdatePurchaseOrderError {
    fn from(error: RepositoryError) -> Self {
        UpdatePurchaseOrderError::DatabaseError(error)
    }
}
