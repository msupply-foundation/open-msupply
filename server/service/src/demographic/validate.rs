use repository::{
    demographic_projection::{DemographicProjectionFilter, DemographicProjectionRepository},
    DemographicIndicatorFilter, DemographicIndicatorRepository, DemographicIndicatorRow,
    DemographicIndicatorRowRepository, DemographicProjectionRow,
    DemographicProjectionRowRepository, EqualFilter, RepositoryError, StorageConnection,
    StringFilter,
};

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

pub fn check_base_year_unique(
    base_year: i32,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let filter = DemographicProjectionFilter::new().base_year(EqualFilter::equal_to_i32(base_year));
    let result = DemographicProjectionRepository::new(connection).query_by_filter(filter)?;
    Ok(result.len() == 0)
}

pub fn check_year_name_combination_unique(
    name: &str,
    base_year: i32,
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let filter = DemographicIndicatorFilter::new()
        .base_year(EqualFilter::equal_to_i32(base_year.to_owned()))
        .name(StringFilter::equal_to(name));
    let mut result = DemographicIndicatorRepository::new(connection).query_by_filter(filter)?;
    let result_overlap = match result.len() {
        0 => true,
        // return ok if editing this id
        1 => {
            if result.pop().unwrap().id == id {
                true
            } else {
                false
            }
        }
        _ => false,
    };
    Ok(result_overlap)
}
