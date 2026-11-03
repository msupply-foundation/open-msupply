use chrono::NaiveDate;
use repository::{
    ActivityLogType, PurchaseOrderLine, PurchaseOrderLineRowRepository, PurchaseOrderLineStatus,
    RepositoryError,
};

use crate::{
    NullableUpdate,
    activity_log::activity_log_entry_with_diff_keeping,
    purchase_order_line::{
        insert::PackSizeCodeCombination,
        log::{LINE_IDENTITY_KEYS, item_code, line_log_detail},
        query::get_purchase_order_line,
    },
    service_provider::ServiceContext,
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
    UpdatedLineDoesNotExist,
    PackSizeCodeCombinationExists(PackSizeCodeCombination),
    DatabaseError(RepositoryError),
    ItemDoesNotExist,
    CannotChangeStatus,
    CannotEditExpectedDeliveryDate,
    ItemCannotBeOrdered(PurchaseOrderLine),
    OtherPartyDoesNotExist,
    OtherPartyNotAManufacturer,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdatePurchaseOrderLineInput {
    pub id: String,
    pub item_id: Option<String>,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
    pub requested_delivery_date: Option<NullableUpdate<NaiveDate>>,
    pub expected_delivery_date: Option<NullableUpdate<NaiveDate>>,
    pub price_per_pack_before_discount: Option<f64>,
    pub price_per_pack_after_discount: Option<f64>,
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
) -> Result<PurchaseOrderLine, UpdatePurchaseOrderLineInputError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (current_purchase_order_line, item) = validate(&input, connection)?;

            let updated_purchase_order_line =
                generate(current_purchase_order_line.clone(), &item, input)?;

            PurchaseOrderLineRowRepository::new(connection)
                .upsert_one(&updated_purchase_order_line)?;

            let activity_type = if current_purchase_order_line.status
                != PurchaseOrderLineStatus::Closed
                && updated_purchase_order_line.status == PurchaseOrderLineStatus::Closed
            {
                ActivityLogType::PurchaseOrderLineStatusClosed
            } else {
                ActivityLogType::PurchaseOrderLineUpdated
            };

            let current_item_code = if current_purchase_order_line.item_id == item.id {
                Some(item.code.clone())
            } else {
                item_code(connection, &current_purchase_order_line.item_id)?
            };
            // Writes nothing when no field changed
            activity_log_entry_with_diff_keeping(
                ctx,
                activity_type,
                Some(updated_purchase_order_line.purchase_order_id.clone()),
                Some(&line_log_detail(
                    connection,
                    &current_purchase_order_line,
                    current_item_code,
                )?),
                &line_log_detail(
                    connection,
                    &updated_purchase_order_line,
                    Some(item.code.clone()),
                )?,
                LINE_IDENTITY_KEYS,
            )?;

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
