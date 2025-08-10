use async_graphql::*;
use chrono::{NaiveDate, NaiveDateTime};
use graphql_core::{
    generic_inputs::NullableUpdateInput,
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
    NullableUpdate,
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
#[graphql(name = "UpdatePurchaseOrderInput")]
pub struct UpdateInput {
    pub id: String,
    pub supplier_id: Option<String>,
    pub status: Option<PurchaseOrderNodeType>,
    pub confirmed_datetime: Option<NullableUpdateInput<NaiveDateTime>>,
    pub comment: Option<String>,
    pub supplier_discount_percentage: Option<f64>,
    pub donor_id: Option<NullableUpdateInput<String>>,
    pub reference: Option<String>,
    pub currency_id: Option<String>,
    pub foreign_exchange_rate: Option<f64>,
    pub shipping_method: Option<String>,
    pub sent_datetime: Option<NullableUpdateInput<NaiveDateTime>>,
    pub contract_signed_date: Option<NullableUpdateInput<NaiveDate>>,
    pub advance_paid_date: Option<NullableUpdateInput<NaiveDate>>,
    pub received_at_port_date: Option<NullableUpdateInput<NaiveDate>>,
    pub requested_delivery_date: Option<NullableUpdateInput<NaiveDate>>,
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
        } = self;

        ServiceInput {
            id,
            supplier_id,
            status: status.map(PurchaseOrderNodeType::to_domain),
            confirmed_datetime: confirmed_datetime.map(|c| NullableUpdate { value: c.value }),
            comment,
            supplier_discount_percentage,
            donor_id: donor_id.map(|d| NullableUpdate { value: d.value }),
            reference,
            currency_id,
            foreign_exchange_rate,
            shipping_method,
            sent_datetime: sent_datetime.map(|s| NullableUpdate { value: s.value }),
            contract_signed_date: contract_signed_date.map(|c| NullableUpdate { value: c.value }),
            advance_paid_date: advance_paid_date.map(|a| NullableUpdate { value: a.value }),
            received_at_port_date: received_at_port_date.map(|r| NullableUpdate { value: r.value }),
            requested_delivery_date: requested_delivery_date
                .map(|r| NullableUpdate { value: r.value }),
        }
    }
}

#[derive(Union)]
#[graphql(name = "UpdatePurchaseOrderResponse")]
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
            resource: Resource::MutatePurchaseOrder,
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
        | ServiceError::PurchaseOrderDoesNotExist
        | ServiceError::NotASupplier
        | ServiceError::DonorDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) | ServiceError::UpdatedRecordNotFound => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
