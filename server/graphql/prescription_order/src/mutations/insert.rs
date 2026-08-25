use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use repository::{PrescriptionOrder, PrescriptionOrderRow};
use service::auth::{Resource, ResourceAccessRequest};
use service::prescription_order::insert::{
    InsertPrescriptionOrder as ServiceInput, InsertPrescriptionOrderError as ServiceError,
};

use crate::types::PrescriptionOrderNode;

#[derive(InputObject)]
#[graphql(name = "InsertPrescriptionOrderInput")]
pub struct InsertInput {
    pub id: String,
    pub patient_id: String,
    pub clinician_id: Option<String>,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub prescription_datetime: Option<DateTime<Utc>>,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            patient_id,
            clinician_id,
            diagnosis_id,
            program_id,
            prescription_datetime,
        } = self;
        ServiceInput {
            id,
            patient_id,
            clinician_id,
            diagnosis_id,
            program_id,
            prescription_datetime: prescription_datetime.map(|d| d.naive_utc()),
        }
    }
}

#[derive(Union)]
#[graphql(name = "InsertPrescriptionOrderResponse")]
pub enum InsertResponse {
    Response(PrescriptionOrderNode),
}

pub fn insert_prescription_order(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInput,
) -> Result<InsertResponse> {
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
            .insert_prescription_order(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<PrescriptionOrderRow, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(prescription_order_row) => Ok(InsertResponse::Response(
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
        ServiceError::PrescriptionOrderAlreadyExists
        | ServiceError::PatientDoesNotExist
        | ServiceError::ClinicianDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}
