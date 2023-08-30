use repository::NameRow;
use repository::{PaginationOption, Patient, PatientFilter, PatientSort, RepositoryError};
use util::constants::PATIENT_TYPE;

use crate::service_provider::ServiceContext;
use crate::service_provider::ServiceProvider;
use crate::ListResult;

mod insert_patient;
pub mod patient_schema;
pub mod patient_updated;
mod query;
mod search;
mod search_central;
mod update_patient;
mod upsert_program_patient;

pub use self::insert_patient::*;
pub use self::query::*;
pub use self::search::*;
pub use self::search_central::*;
pub use self::update_patient::*;
pub use self::upsert_program_patient::*;

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

    fn upsert_program_patient(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: &str,
        user_id: &str,
        input: UpdateProgramPatient,
    ) -> Result<Patient, UpdateProgramPatientError> {
        upsert_program_patient(ctx, service_provider, store_id, user_id, input)
    }

    fn patient_search(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        input: PatientSearch,
        allowed_ctx: Option<&[String]>,
    ) -> Result<ListResult<PatientSearchResult>, RepositoryError> {
        patient_search(ctx, service_provider, input, allowed_ctx)
    }

    fn insert_patient(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        store_id: &str,
        input: NameRow,
    ) -> Result<Patient, InsertPatientError> {
        insert_patient(ctx, service_provider, store_id, input)
    }

    fn update_patient(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        input: UpdatePatient,
    ) -> Result<Patient, UpdatePatientError> {
        update_patient(ctx, service_provider, input)
    }
}

pub struct PatientService {}
impl PatientServiceTrait for PatientService {}
