use async_graphql::*;
use chrono::{NaiveDate, NaiveDateTime};
use graphql_core::{
    standard_graphql_error::{
        validate_auth,
        StandardGraphqlError::{BadUserInput, InternalError},
    },
    ContextExt,
};
use graphql_types::types::IdResponse;
use repository::{PurchaseOrderRow, PurchaseOrderStatus};
use serde::Serialize;

use service::{
    auth::{Resource, ResourceAccessRequest},
    purchase_order::update::{
        UpdatePurchaseOrderError as ServiceError, UpdatePurchaseOrderInput as ServiceInput,
    },
};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PurchaseOrderNodeType {
    New,
    Confirmed,
    Authorised,
    Finalised,
}

impl PurchaseOrderNodeType {
    pub fn from_domain(domain_type: &PurchaseOrderStatus) -> Self {
        match domain_type {
            PurchaseOrderStatus::New => PurchaseOrderNodeType::New,
            PurchaseOrderStatus::Confirmed => PurchaseOrderNodeType::Confirmed,
            PurchaseOrderStatus::Authorised => PurchaseOrderNodeType::Authorised,
            PurchaseOrderStatus::Finalised => PurchaseOrderNodeType::Finalised,
        }
    }

    pub fn to_domain(self) -> PurchaseOrderStatus {
        match self {
            PurchaseOrderNodeType::New => PurchaseOrderStatus::New,
            PurchaseOrderNodeType::Confirmed => PurchaseOrderStatus::Confirmed,
            PurchaseOrderNodeType::Authorised => PurchaseOrderStatus::Authorised,
            PurchaseOrderNodeType::Finalised => PurchaseOrderStatus::Finalised,
        }
    }
}

#[derive(InputObject)]
pub struct UpdateInput {
    pub id: String,
    pub supplier_id: Option<String>,
    pub status: Option<PurchaseOrderNodeType>,
    pub confirmed_datetime: Option<NaiveDateTime>,
    pub comment: Option<String>,
    pub supplier_discount_percentage: Option<f64>,
    pub supplier_discount_amount: Option<f64>,
    pub donor_link_id: Option<String>,
    pub currency_id: Option<String>,
    pub foreign_exchange_rate: Option<f64>,
    pub shipping_method: Option<String>,
    pub sent_date: Option<NaiveDate>,
    pub contract_signed_date: Option<NaiveDate>,
    pub advance_paid_date: Option<NaiveDate>,
    pub received_at_port_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            supplier_id,
            status,
            confirmed_datetime,
            comment,
            supplier_discount_percentage,
            supplier_discount_amount,
            donor_link_id,
            currency_id,
            foreign_exchange_rate,
            shipping_method,
            sent_date,
            contract_signed_date,
            advance_paid_date,
            received_at_port_date,
            expected_delivery_date,
        } = self;

        ServiceInput {
            id,
            supplier_id,
            status: status.map(PurchaseOrderNodeType::to_domain),
            confirmed_datetime,
            comment,
            supplier_discount_percentage,
            supplier_discount_amount,
            donor_link_id,
            currency_id,
            foreign_exchange_rate,
            shipping_method,
            sent_date,
            contract_signed_date,
            advance_paid_date,
            received_at_port_date,
            expected_delivery_date,
        }
    }
}

#[derive(Union)]
pub enum UpdateResponse {
    Response(IdResponse),
}

pub fn update_purchase_order(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateInput,
) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: Some(store_id.to_string()),
        },
    );

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user?.user_id)?;

    map_response(
        service_provider
            .purchase_order_service
            .update_purchase_order(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<PurchaseOrderRow, ServiceError>) -> Result<UpdateResponse> {
    match from {
        Ok(purchase_order) => Ok(UpdateResponse::Response(IdResponse(purchase_order.id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::SupplierDoesNotExist
        | ServiceError::UpdatedRecordNotFound
        | ServiceError::NotASupplier
        | ServiceError::DonorDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
