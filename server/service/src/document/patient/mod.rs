use repository::{PaginationOption, RepositoryError};

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;
use crate::ListResult;

pub use self::query::*;
mod query;
pub use self::update::*;
pub mod patient_schema;
pub mod patient_updated;
mod update;
pub use self::search::*;
mod search;

/// The default document type for a patient
pub const PATIENT_TYPE: &str = "Patient";

pub fn patient_doc_name(patient_id: &str) -> String {
    format!("patients/{}", patient_id)
}

pub fn patient_program_doc_name(patient_id: &str, program: &str) -> String {
    format!("patients/{}/programs/{}", patient_id, program)
}

pub fn patient_program_encounter_doc_name(
    patient_id: &str,
    program: &str,
    encounter_id: &str,
) -> String {
    format!(
        "patients/{}/programs/{}/encounters/{}",
        patient_id, program, encounter_id
    )
}

pub trait PatientServiceTrait: Sync + Send {
    fn get_patients(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<PatientFilter>,
        sort: Option<PatientSort>,
    ) -> Result<ListResult<Patient>, RepositoryError> {
        get_patients(ctx, store_id, pagination, filter, sort)
    }

    fn update_patient(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: &str,
        user_id: &str,
        input: UpdatePatient,
    ) -> Result<Patient, UpdatePatientError> {
        update_patient(ctx, service_provider, store_id, user_id, input)
    }

    fn patient_search(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: &str,
        input: PatientSearch,
    ) -> Result<Vec<PatientSearchResult>, RepositoryError> {
        patient_search(ctx, service_provider, store_id, input)
    }
}

pub struct PatientService {}
impl PatientServiceTrait for PatientService {}
