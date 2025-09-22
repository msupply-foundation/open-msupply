use chrono::NaiveDate;
use repository::{
    ActivityLogType, PurchaseOrderLine, PurchaseOrderLineRowRepository, PurchaseOrderLineStatus,
    PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError,
};

use crate::{
    activity_log::activity_log_entry,
    purchase_order::update::{update_purchase_order, UpdatePurchaseOrderInput},
    purchase_order_line::{insert::PackSizeCodeCombination, query::get_purchase_order_line},
    service_provider::ServiceContext,
    NullableUpdate,
};

mod generate;
mod test;
mod validate;

use generate::generate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum UpdatePurchaseOrderLineInputError {
    PurchaseOrderLineNotFound,
    PurchaseOrderDoesNotExist,
    CannotEditPurchaseOrder,
    CannotEditPurchaseOrderLine,
    CannotEditRequestedQuantity,
    CannotEditAdjustedQuantity,
    CannotEditQuantityBelowReceived,
    UpdatedLineDoesNotExist,
    PackSizeCodeCombinationExists(PackSizeCodeCombination),
    DatabaseError(RepositoryError),
    ItemDoesNotExist,
    CannotChangeStatus,
    ItemCannotBeOrdered(PurchaseOrderLine),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdatePurchaseOrderLineInput {
    pub id: String,
    pub item_id: Option<String>,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
    pub adjusted_number_of_units: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub price_per_unit_before_discount: Option<f64>,
    pub price_per_unit_after_discount: Option<f64>,
    pub manufacturer_id: Option<NullableUpdate<String>>,
    pub note: Option<NullableUpdate<String>>,
    pub unit: Option<String>,
    pub supplier_item_code: Option<NullableUpdate<String>>,
    pub comment: Option<NullableUpdate<String>>,
    pub status: Option<PurchaseOrderLineStatus>,
}

pub fn update_purchase_order_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdatePurchaseOrderLineInput,
    user_has_auth_permission: Option<bool>,
) -> Result<PurchaseOrderLine, UpdatePurchaseOrderLineInputError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            let purchase_order_line = validate(&input, connection, user_has_auth_permission)?;
            let purchase_order_id = purchase_order_line.purchase_order_id.clone();
            let updated_purchase_order_line = generate(purchase_order_line, input.clone())?;

            PurchaseOrderLineRowRepository::new(connection)
                .upsert_one(&updated_purchase_order_line)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PurchaseOrderLineUpdated,
                Some(updated_purchase_order_line.purchase_order_id.clone()),
                None,
                None,
            )?;

            // Update Purchase Order status from Sent to Confirmed if adjusted amount is changed
            if input.adjusted_number_of_units.is_some() {
                let purchase_order = PurchaseOrderRowRepository::new(connection)
                    .find_one_by_id(&purchase_order_id)?
                    .ok_or(UpdatePurchaseOrderLineInputError::PurchaseOrderDoesNotExist)?;
                // Only update status and log if the purchase order status is Sent
                if purchase_order.status == PurchaseOrderStatus::Sent {
                    let input = UpdatePurchaseOrderInput {
                        id: purchase_order.id.clone(),
                        status: Some(PurchaseOrderStatus::Confirmed),
                        supplier_id: None,
                        confirmed_datetime: None,
                        comment: None,
                        supplier_discount_percentage: None,
                        supplier_discount_amount: None,
                        donor_id: None,
                        reference: None,
                        currency_id: None,
                        foreign_exchange_rate: None,
                        shipping_method: None,
                        sent_datetime: Some(NullableUpdate { value: None }),
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
                    };
                    let _ = update_purchase_order(ctx, store_id, input, user_has_auth_permission);
                    activity_log_entry(
                        ctx,
                        ActivityLogType::PurchaseOrderLineUpdated,
                        Some(purchase_order.id.clone()),
                        Some(format!("{:?}", PurchaseOrderStatus::Sent)),
                        Some(format!("{:?}", PurchaseOrderStatus::Confirmed)),
                    )?;
                }
            }

            get_purchase_order_line(ctx, Some(store_id), &updated_purchase_order_line.id)
                .map_err(UpdatePurchaseOrderLineInputError::DatabaseError)?
                .ok_or(UpdatePurchaseOrderLineInputError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(purchase_order_line)
}

impl From<RepositoryError> for UpdatePurchaseOrderLineInputError {
    fn from(error: RepositoryError) -> Self {
        UpdatePurchaseOrderLineInputError::DatabaseError(error)
    }
}
