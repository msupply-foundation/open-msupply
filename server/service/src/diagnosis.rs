use repository::{
    diagnosis::{Diagnosis, DiagnosisFilter, DiagnosisRepository},
    RepositoryError, StorageConnectionManager,
};

pub fn get_all_active_diagnoses(
    connection_manager: &StorageConnectionManager,
) -> Result<Vec<Diagnosis>, RepositoryError> {
    let connection = connection_manager.connection()?;
    let repository = DiagnosisRepository::new(&connection);

    let rows = repository.query_by_filter(DiagnosisFilter::new().is_active(true))?;

    Ok(rows)
}
