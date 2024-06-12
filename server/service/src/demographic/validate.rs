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
    Ok(result.is_empty())
}

pub fn check_year_name_combination_unique(
    name: &str,
    base_year: i32,
    id: Option<String>,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let mut filter = DemographicIndicatorFilter::new()
        .base_year(EqualFilter::equal_to_i32(base_year.to_owned()))
        .name(StringFilter::equal_to(name));

    if let Some(id) = id {
        filter = filter.id(EqualFilter::not_equal_to(&id));
    }
    let result = DemographicIndicatorRepository::new(connection).query_by_filter(filter)?;
    Ok(result.len() == 0)
}
