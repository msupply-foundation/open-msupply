use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::generic_inputs::NullableUpdateInput;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use repository::{PrescriptionOrder, PrescriptionOrderRow};
use service::auth::{Resource, ResourceAccessRequest};
use service::prescription_order::update::{
    UpdatePrescriptionOrder as ServiceInput, UpdatePrescriptionOrderError as ServiceError,
    UpdatePrescriptionOrderStatus,
};
use service::NullableUpdate;

use crate::types::PrescriptionOrderNode;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum UpdatePrescriptionOrderStatusInput {
    /// Locks the order and generates the dispensing invoice
    ReadyToDispense,
}

#[derive(InputObject)]
#[graphql(name = "UpdatePrescriptionOrderInput")]
pub struct UpdateInput {
    pub id: String,
    pub patient_id: Option<String>,
    pub clinician_id: Option<NullableUpdateInput<String>>,
    pub diagnosis_id: Option<NullableUpdateInput<String>>,
    pub program_id: Option<NullableUpdateInput<String>>,
    pub prescription_datetime: Option<DateTime<Utc>>,
    pub comment: Option<NullableUpdateInput<String>>,
    /// Patch of customFields key -> value; a JSON null deletes that key. Keys
    /// must be visible for the "prescription_order" scope.
    pub custom_fields: Option<Json<serde_json::Map<String, serde_json::Value>>>,
    pub status: Option<UpdatePrescriptionOrderStatusInput>,
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            patient_id,
            clinician_id,
            diagnosis_id,
            program_id,
            prescription_datetime,
            comment,
            custom_fields,
            status,
        } = self;
        ServiceInput {
            id,
            patient_id,
            clinician_id: clinician_id.map(|u| NullableUpdate { value: u.value }),
            diagnosis_id: diagnosis_id.map(|u| NullableUpdate { value: u.value }),
            program_id: program_id.map(|u| NullableUpdate { value: u.value }),
            prescription_datetime: prescription_datetime.map(|d| d.naive_utc()),
            comment: comment.map(|u| NullableUpdate { value: u.value }),
            custom_fields: custom_fields.map(|json| json.0),
            status: status.map(|status| match status {
                UpdatePrescriptionOrderStatusInput::ReadyToDispense => {
                    UpdatePrescriptionOrderStatus::ReadyToDispense
                }
            }),
        }
    }
}

#[derive(Union)]
#[graphql(name = "UpdatePrescriptionOrderResponse")]
pub enum UpdateResponse {
    Response(PrescriptionOrderNode),
}

pub fn update_prescription_order(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateInput,
) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .prescription_order_service
            .update_prescription_order(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<PrescriptionOrderRow, ServiceError>) -> Result<UpdateResponse> {
    match from {
        Ok(prescription_order_row) => Ok(UpdateResponse::Response(
            PrescriptionOrderNode::from_domain(PrescriptionOrder {
                prescription_order_row,
            }),
        )),
        Err(error) => Err(map_error(error)),
    }
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    let formatted_error = format!("{error:#?}");
    match error {
        ServiceError::PrescriptionOrderDoesNotExist
        | ServiceError::NotThisStorePrescriptionOrder
        | ServiceError::NotEditable
        | ServiceError::PatientDoesNotExist
        | ServiceError::ClinicianDoesNotExist
        | ServiceError::UnknownCustomFieldKey(_)
        | ServiceError::NoLines => BadUserInput(formatted_error),
        ServiceError::CreatedDispensationError(_) | ServiceError::DatabaseError(_) => {
            InternalError(formatted_error)
        }
    }
    .extend()
}
