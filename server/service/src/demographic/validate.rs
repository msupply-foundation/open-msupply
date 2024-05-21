use repository::{
    DemographicIndicatorRow, DemographicIndicatorRowRepository, DemographicProjectionRow,
    DemographicProjectionRowRepository, RepositoryError, StorageConnection,
};

// use super::update_demographic_indicator::UpdateDemographicIndicatorError;
// use super::update_demographic_projection::UpdateDemographicProjectionError;

pub fn check_demographic_indicator_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<DemographicIndicatorRow>, RepositoryError> {
    DemographicIndicatorRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_demographic_projection_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<DemographicProjectionRow>, RepositoryError> {
    DemographicProjectionRowRepository::new(connection).find_one_by_id(id)
}
