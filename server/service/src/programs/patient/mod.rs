use repository::{PaginationOption, Patient, PatientFilter, PatientSort, RepositoryError};

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;
use crate::ListResult;

pub mod patient_schema;
pub mod patient_updated;
mod query;
mod search;
mod search_central;
mod upsert;

pub use self::query::*;
pub use self::search::*;
pub use self::search_central::*;
pub use self::upsert::*;

/// The default document type for a patient
pub const PATIENT_TYPE: &str = "Patient";

pub fn main_patient_doc_name(patient_id: &str) -> String {
    patient_doc_name(patient_id, PATIENT_TYPE)
}

pub fn patient_doc_name(patient_id: &str, doc_type: &str) -> String {
    format!("p/{}/{}", patient_id, doc_type)
}

/// Note: the "p" prefix simply indicates that the used naming schema, i.e. how the name is
/// constructed
pub fn patient_doc_name_with_id(patient_id: &str, doc_type: &str, id: &str) -> String {
    format!("p/{}/{}/{}", patient_id, doc_type, id)
}

pub trait PatientServiceTrait: Sync + Send {
    fn get_patients(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<PatientFilter>,
        sort: Option<PatientSort>,
        allowed_ctx: Option<&[String]>,
    ) -> Result<ListResult<Patient>, RepositoryError> {
        get_patients(ctx, pagination, filter, sort, allowed_ctx)
    }

    fn upsert_patient(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: &str,
        user_id: &str,
        input: UpdatePatient,
    ) -> Result<Patient, UpdatePatientError> {
        upsert_patient(ctx, service_provider, store_id, user_id, input)
    }

    fn patient_search(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        input: PatientSearch,
        allowed_ctx: Option<&[String]>,
    ) -> Result<Vec<PatientSearchResult>, RepositoryError> {
        patient_search(ctx, service_provider, input, allowed_ctx)
    }
}

pub struct PatientService {}
impl PatientServiceTrait for PatientService {}
