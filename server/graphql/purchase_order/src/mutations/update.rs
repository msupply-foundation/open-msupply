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
use graphql_types::{generic_errors::ItemCannotBeOrdered, types::IdResponse};
use repository::{PurchaseOrderLine, PurchaseOrderRow, PurchaseOrderStatus};
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
    RequestApproval,
    Confirmed,
    Sent,
    Finalised,
}

impl PurchaseOrderNodeType {
    pub fn from_domain(domain_type: &PurchaseOrderStatus) -> Self {
        match domain_type {
            PurchaseOrderStatus::New => PurchaseOrderNodeType::New,
            PurchaseOrderStatus::RequestApproval => PurchaseOrderNodeType::RequestApproval,
            PurchaseOrderStatus::Confirmed => PurchaseOrderNodeType::Confirmed,
            PurchaseOrderStatus::Sent => PurchaseOrderNodeType::Sent,
            PurchaseOrderStatus::Finalised => PurchaseOrderNodeType::Finalised,
        }
    }

    pub fn to_domain(self) -> PurchaseOrderStatus {
        match self {
            PurchaseOrderNodeType::New => PurchaseOrderStatus::New,
            PurchaseOrderNodeType::RequestApproval => PurchaseOrderStatus::RequestApproval,
            PurchaseOrderNodeType::Confirmed => PurchaseOrderStatus::Confirmed,
            PurchaseOrderNodeType::Sent => PurchaseOrderStatus::Sent,
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
        }
    }
}

pub struct ItemsCannotBeOrdered(pub Vec<PurchaseOrderLine>);
#[Object]
impl ItemsCannotBeOrdered {
    pub async fn description(&self) -> &str {
        "One or more items in the purchase order cannot be ordered. Please check the items and try again."
    }

    pub async fn lines(&self) -> Vec<ItemCannotBeOrdered> {
        self.0
            .clone()
            .into_iter()
            .map(ItemCannotBeOrdered::from_domain)
            .collect()
    }
}

#[derive(Interface)]
#[graphql(name = "UpdatePurchaseOrderErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    ItemsCannotBeOrdered(ItemsCannotBeOrdered),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdatePurchaseOrderError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdatePurchaseOrderResponse")]
pub enum UpdateResponse {
    Response(IdResponse),
    Error(UpdateError),
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
    )?;

    if input.status == Some(PurchaseOrderNodeType::Authorised) {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::AuthorisePurchaseOrder,
                store_id: Some(store_id.to_string()),
            },
        )?;
    }

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .purchase_order_service
            .update_purchase_order(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<PurchaseOrderRow, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(purchase_order) => UpdateResponse::Response(IdResponse(purchase_order.id)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::ItemsCannotBeOrdered(lines) => {
            return Ok(UpdateErrorInterface::ItemsCannotBeOrdered(
                ItemsCannotBeOrdered(lines),
            ))
        }

        ServiceError::SupplierDoesNotExist
        | ServiceError::PurchaseOrderDoesNotExist
        | ServiceError::NotASupplier
        | ServiceError::DonorDoesNotExist
        | ServiceError::AuthorisationPreferenceNotSet => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) | ServiceError::UpdatedRecordNotFound => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
