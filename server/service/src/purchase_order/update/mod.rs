use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ActivityLogType, PurchaseOrderLine, PurchaseOrderLineRowRepository, PurchaseOrderRow,
    PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError, TransactionError,
};

use crate::{
    activity_log::{activity_log_entry, log_type_from_purchase_order_status},
    purchase_order::update::generate::GenerateResult,
    service_provider::ServiceContext,
    NullableUpdate,
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
    UserUnableToAuthorisePurchaseOrder,
    CannotEditSentPurchaseOrder,
    DatabaseError(RepositoryError),
    ItemsCannotBeOrdered(Vec<PurchaseOrderLine>),
    InboundShipmentsNotVerified,
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
    pub fn is_status_only_change(&self) -> bool {
        let Self {
            id: _,
            status: _,
            // Comment is editable on sent POs, only disabled when finalised
            comment: _,
            // All other fields must be None
            supplier_id,
            confirmed_datetime,
            supplier_discount_percentage,
            supplier_discount_amount,
            donor_id,
            reference,
            currency_id,
            foreign_exchange_rate,
            shipping_method,
            sent_datetime,
            contract_signed_date,
            advance_paid_date,
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
        supplier_id.is_none()
            && confirmed_datetime.is_none()
            && supplier_discount_percentage.is_none()
            && supplier_discount_amount.is_none()
            && donor_id.is_none()
            && reference.is_none()
            && currency_id.is_none()
            && foreign_exchange_rate.is_none()
            && shipping_method.is_none()
            && sent_datetime.is_none()
            && contract_signed_date.is_none()
            && advance_paid_date.is_none()
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
    user_has_auth_permission: Option<bool>,
) -> Result<PurchaseOrderRow, UpdatePurchaseOrderError> {
    let purchase_order = ctx
        .connection
        .transaction_sync(|connection: &repository::StorageConnection| {
            let (purchase_order, next_status) =
                validate(&input, store_id, connection, user_has_auth_permission)?;
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

            let activity_type = if existing_purchase_order.purchase_order_row.status
                == PurchaseOrderStatus::Sent
                && input.status == Some(PurchaseOrderStatus::Confirmed)
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

            purchase_order_repository
                .find_one_by_id(&updated_purchase_order.id)?
                .ok_or(UpdatePurchaseOrderError::UpdatedRecordNotFound)
        })
        .map_err(|error: TransactionError<UpdatePurchaseOrderError>| error.to_inner_error())?;

    Ok(purchase_order)
}

impl From<RepositoryError> for UpdatePurchaseOrderError {
    fn from(error: RepositoryError) -> Self {
        UpdatePurchaseOrderError::DatabaseError(error)
    }
}
