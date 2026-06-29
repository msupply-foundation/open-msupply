use async_graphql::*;

use graphql_core::{
    simple_generic_errors::{OtherPartyNotACustomer, OtherPartyNotVisible},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::invoice::customer_return::update::{
    UpdateCustomerReturn as ServiceInput, UpdateCustomerReturnError as ServiceError,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::customer_return::update::UpdateCustomerReturnStatus,
};

#[derive(InputObject)]
#[graphql(name = "UpdateCustomerReturnInput")]
pub struct UpdateInput {
    pub id: String,
    other_party_id: Option<String>,
    status: Option<UpdateCustomerReturnStatusInput>,
    on_hold: Option<bool>,
    comment: Option<String>,
    colour: Option<String>,
    their_reference: Option<String>,
    /// Patch of customFields key -> value (JSON object) merged into the
    /// invoice's custom properties; a `null` value clears that key, keys absent
    /// from the patch are left unchanged.
    custom_fields: Option<Json<serde_json::Map<String, serde_json::Value>>>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateCustomerReturnStatusInput {
    Received,
    Verified,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateCustomerReturnError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Interface)]
#[graphql(name = "UpdateCustomerReturnErrorInterface")]
#[graphql(field(name = "description", ty = "&str"))]
pub enum UpdateErrorInterface {
    OtherPartyNotACustomer(OtherPartyNotACustomer),
    OtherPartyNotVisible(OtherPartyNotVisible),
}

#[derive(Union)]
#[graphql(name = "UpdateCustomerReturnResponse")]
pub enum UpdateResponse {
    Response(InvoiceNode),
    Error(UpdateError),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateCustomerReturn,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .update_customer_return(&service_context, input.to_domain());

    let result = match result {
        Ok(customer_return) => UpdateResponse::Response(InvoiceNode::from_domain(customer_return)),
        Err(err) => UpdateResponse::Error(UpdateError {
            error: map_error(err)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::OtherPartyNotACustomer => {
            return Ok(UpdateErrorInterface::OtherPartyNotACustomer(
                OtherPartyNotACustomer,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(UpdateErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::InvoiceDoesNotExist
        | ServiceError::NotACustomerReturn
        | ServiceError::NotThisStoreInvoice
        | ServiceError::CannotReverseInvoiceStatus
        | ServiceError::ReturnIsNotEditable
        | ServiceError::CannotChangeStatusOfInvoiceOnHold
        | ServiceError::OtherPartyDoesNotExist
        | ServiceError::UnknownPropertyKey(_) => BadUserInput(formatted_error),

        ServiceError::UpdatedInvoiceDoesNotExist | ServiceError::DatabaseError(_) => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            comment,
            status,
            on_hold,
            colour,
            their_reference,
            other_party_id,
            custom_fields,
        }: UpdateInput = self;

        ServiceInput {
            id,
            status: status.map(|status| status.to_domain()),
            comment,
            on_hold,
            colour,
            their_reference,
            other_party_id,
            custom_fields: custom_fields.map(|json| json.0),
        }
    }
}

impl UpdateCustomerReturnStatusInput {
    pub fn to_domain(&self) -> UpdateCustomerReturnStatus {
        use UpdateCustomerReturnStatus::*;
        match self {
            UpdateCustomerReturnStatusInput::Received => Received,
            UpdateCustomerReturnStatusInput::Verified => Verified,
        }
    }
}
