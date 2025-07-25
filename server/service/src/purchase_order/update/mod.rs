use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus, RepositoryError,
    TransactionError,
};

use crate::service_provider::ServiceContext;

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
    pub confirmed_datetime: Option<NaiveDateTime>,
    pub comment: Option<String>,
    pub supplier_discount_percentage: Option<f64>,
    pub supplier_discount_amount: Option<f64>,
    pub donor_link_id: Option<String>,
    pub reference: Option<String>,
    pub currency_id: Option<String>,
    pub foreign_exchange_rate: Option<f64>,
    pub shipping_method: Option<String>,
    pub sent_datetime: Option<NaiveDateTime>,
    pub contract_signed_date: Option<NaiveDate>,
    pub advance_paid_date: Option<NaiveDate>,
    pub received_at_port_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
}

pub fn update_purchase_order(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdatePurchaseOrderInput,
) -> Result<PurchaseOrderRow, UpdatePurchaseOrderError> {
    let purchase_order = ctx
        .connection
        .transaction_sync(|connection| {
            let purchase_order = validate(&input, &store_id, connection)?;
            let updated_purchase_order = generate(purchase_order, input)?;

            let purchase_order_repository = PurchaseOrderRowRepository::new(connection);
            purchase_order_repository.upsert_one(&updated_purchase_order)?;

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
