use repository::{PaginationOption, RepositoryError};

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;
use crate::ListResult;

pub use self::query::*;
mod query;
pub use self::upsert::*;
pub mod patient_schema;
pub mod patient_updated;
mod upsert;
pub use self::search::*;
mod search;

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
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<PatientFilter>,
        sort: Option<PatientSort>,
    ) -> Result<ListResult<Patient>, RepositoryError> {
        get_patients(ctx, store_id, pagination, filter, sort)
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
        store_id: &str,
        input: PatientSearch,
    ) -> Result<Vec<PatientSearchResult>, RepositoryError> {
        patient_search(ctx, service_provider, store_id, input)
    }
}

pub struct PatientService {}
impl PatientServiceTrait for PatientService {}
