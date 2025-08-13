use chrono::NaiveDate;
use repository::{
    ActivityLogType, PurchaseOrderLine, PurchaseOrderLineRowRepository, RepositoryError,
};

use crate::{
    activity_log::activity_log_entry,
    purchase_order_line::{insert::PackSizeCodeCombination, query::get_purchase_order_line},
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
    CannotAdjustRequestedQuantity,
    UpdatedLineDoesNotExist,
    PackSizeCodeCombinationExists(PackSizeCodeCombination),
    DatabaseError(RepositoryError),
    ItemDoesNotExist,
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
}

pub fn update_purchase_order_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdatePurchaseOrderLineInput,
) -> Result<PurchaseOrderLine, UpdatePurchaseOrderLineInputError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            let purchase_order_line = validate(&input, connection)?;
            let updated_purchase_order_line = generate(purchase_order_line, &input)?;

            PurchaseOrderLineRowRepository::new(connection)
                .upsert_one(&updated_purchase_order_line)?;

            activity_log_entry(
                &ctx,
                ActivityLogType::PurchaseOrderLineUpdated,
                Some(updated_purchase_order_line.purchase_order_id.clone()),
                None,
                None,
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
