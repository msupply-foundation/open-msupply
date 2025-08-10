use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError,
    TransactionError,
};

use crate::{
    activity_log::{activity_log_entry, log_type_from_purchase_order_status},
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
    UpdatedRecordNotFound,
    NotASupplier,
    DonorDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdatePurchaseOrderInput {
    pub id: String,
    pub supplier_id: Option<String>,
    pub status: Option<PurchaseOrderStatus>,
    pub confirmed_datetime: Option<NullableUpdate<NaiveDateTime>>,
    pub comment: Option<String>,
    pub supplier_discount_percentage: Option<f64>,
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
}

pub fn update_purchase_order(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdatePurchaseOrderInput,
) -> Result<PurchaseOrderRow, UpdatePurchaseOrderError> {
    let purchase_order = ctx
        .connection
        .transaction_sync(|connection: &repository::StorageConnection| {
            let (purchase_order, old_status) = validate(&input, &store_id, connection)?;
            let updated_purchase_order = generate(purchase_order, input)?;

            let purchase_order_repository = PurchaseOrderRowRepository::new(connection);
            purchase_order_repository.upsert_one(&updated_purchase_order)?;

            activity_log_entry(
                ctx,
                log_type_from_purchase_order_status(
                    &updated_purchase_order.status,
                    Some(old_status),
                ),
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
