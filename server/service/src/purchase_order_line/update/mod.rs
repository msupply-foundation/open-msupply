use chrono::NaiveDate;
use repository::{
    ActivityLogType, PurchaseOrderLine, PurchaseOrderLineRowRepository, PurchaseOrderLineStatus,
    PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError,
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
            let current_purchase_order_line =
                validate(&input, connection, user_has_auth_permission)?;
            let purchase_order_id = current_purchase_order_line.purchase_order_id.clone();

            // Check if the adjusted units have changed
            let mut updated_input = input.clone();

            let line_status_change = if input.adjusted_number_of_units
                != current_purchase_order_line.adjusted_number_of_units
            {
                // Then check if the purchase order is in Sent status
                let purchase_order = PurchaseOrderRowRepository::new(connection)
                    .find_one_by_id(&purchase_order_id)?
                    .ok_or(UpdatePurchaseOrderLineInputError::PurchaseOrderDoesNotExist)?;

                // Update purchase order status and line status
                if purchase_order.status == PurchaseOrderStatus::Sent {
                    update_order_status_on_adjusted_quantity_change(
                        ctx,
                        store_id,
                        purchase_order,
                        user_has_auth_permission,
                    )?;

                    // Set line status to New
                    updated_input.status = Some(PurchaseOrderLineStatus::New);

                    Some((PurchaseOrderLineStatus::Sent, PurchaseOrderLineStatus::New))
                } else {
                    None
                }
            } else {
                None
            };

            // Generate the line with the updated input
            let updated_purchase_order_line =
                generate(current_purchase_order_line.clone(), updated_input)?;

            PurchaseOrderLineRowRepository::new(connection)
                .upsert_one(&updated_purchase_order_line)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PurchaseOrderLineUpdated,
                Some(updated_purchase_order_line.purchase_order_id.clone()),
                line_status_change
                    .as_ref()
                    .map(|(from, _)| format!("{:?}", from)),
                line_status_change
                    .as_ref()
                    .map(|(_, to)| format!("{:?}", to)),
            )?;

            get_purchase_order_line(ctx, Some(store_id), &updated_purchase_order_line.id)
                .map_err(UpdatePurchaseOrderLineInputError::DatabaseError)?
                .ok_or(UpdatePurchaseOrderLineInputError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(purchase_order_line)
}

// Update Purchase Order status from Sent to Confirmed
fn update_order_status_on_adjusted_quantity_change(
    ctx: &ServiceContext,
    store_id: &str,
    purchase_order: PurchaseOrderRow,
    user_has_auth_permission: Option<bool>,
) -> Result<(), UpdatePurchaseOrderLineInputError> {
    let purchase_order_input = create_purchase_order_input(&purchase_order.id);

    update_purchase_order(
        ctx,
        store_id,
        purchase_order_input,
        user_has_auth_permission,
    )
    .map_err(|_| UpdatePurchaseOrderLineInputError::DatabaseError(RepositoryError::NotFound))?;

    activity_log_entry(
        ctx,
        ActivityLogType::PurchaseOrderLineUpdated, // TODO: Implement PurchaseOrderUpdated
        Some(purchase_order.id.clone()),
        Some(format!("{:?}", PurchaseOrderStatus::Sent)),
        Some(format!("{:?}", PurchaseOrderStatus::Confirmed)),
    )?;

    Ok(())
}

fn create_purchase_order_input(purchase_order_id: &str) -> UpdatePurchaseOrderInput {
    UpdatePurchaseOrderInput {
        id: purchase_order_id.to_string(),
        status: Some(PurchaseOrderStatus::Confirmed),
        sent_datetime: Some(NullableUpdate { value: None }),
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
    }
}

impl From<RepositoryError> for UpdatePurchaseOrderLineInputError {
    fn from(error: RepositoryError) -> Self {
        UpdatePurchaseOrderLineInputError::DatabaseError(error)
    }
}
