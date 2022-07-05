use chrono::NaiveDate;
use repository::{DateFilter, RepositoryError, SimpleStringFilter};

use crate::service_provider::{ServiceContext, ServiceProvider};

use super::{Patient, PatientFilter};

pub struct PatientSearch {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub date_of_birth: Option<NaiveDate>,
}

pub struct PatientSearchResult {
    pub patient: Patient,
    /// Indicates how good the match was
    pub score: f64,
}

pub fn patient_search(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: String,
    input: PatientSearch,
) -> Result<Vec<PatientSearchResult>, RepositoryError> {
    let mut filter = PatientFilter::new();
    if let Some(first_name) = input.first_name {
        filter = filter.first_name(SimpleStringFilter::equal_to(&first_name));
    }
    if let Some(last_name) = input.last_name {
        filter = filter.last_name(SimpleStringFilter::equal_to(&last_name));
    }
    if let Some(date_of_birth) = input.date_of_birth {
        filter = filter.date_of_birth(DateFilter::equal_to(date_of_birth));
    }

    let results: Vec<PatientSearchResult> = service_provider
        .patient_service
        .get_patients(ctx, &store_id, None, Some(filter), None)?
        .rows
        .into_iter()
        .map(|patient| PatientSearchResult {
            patient,
            score: 1.0,
        })
        .collect();
    Ok(results)
}
