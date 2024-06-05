use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    DemographicIndicatorRow, DemographicIndicatorRowRepository, RepositoryError, StorageConnection,
};

use super::{
    query_demographic_indicator::get_demographic_indicator,
    validate::{check_demographic_indicator_exists, check_year_name_combination_unique},
};

#[derive(PartialEq, Debug)]
pub enum InsertDemographicIndicatorError {
    DemographicIndicatorAlreadyExists,
    DemographicIndicatorAlreadyExistsForThisYear,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertDemographicIndicator {
    pub id: String,
    pub name: String,
    pub base_year: i32,
    pub base_population: Option<i32>,
    pub population_percentage: Option<f64>,
    pub year_1_projection: Option<i32>,
    pub year_2_projection: Option<i32>,
    pub year_3_projection: Option<i32>,
    pub year_4_projection: Option<i32>,
    pub year_5_projection: Option<i32>,
}

pub fn insert_demographic_indicator(
    ctx: &ServiceContext,
    input: InsertDemographicIndicator,
) -> Result<DemographicIndicatorRow, InsertDemographicIndicatorError> {
    let demographic_indicator = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;

            let new_demographic_indicator = generate(input);
            DemographicIndicatorRowRepository::new(connection)
                .upsert_one(&new_demographic_indicator)?;

            // TODO add activity log entry

            get_demographic_indicator(ctx, new_demographic_indicator.id)
                .map_err(InsertDemographicIndicatorError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(demographic_indicator)
}

pub fn validate(
    input: &InsertDemographicIndicator,
    connection: &StorageConnection,
) -> Result<(), InsertDemographicIndicatorError> {
    if !check_year_name_combination_unique(&input.name, input.base_year, &input.id, connection)? {
        return Err(InsertDemographicIndicatorError::DemographicIndicatorAlreadyExistsForThisYear);
    }

    if check_demographic_indicator_exists(&input.id, connection)?.is_some() {
        return Err(InsertDemographicIndicatorError::DemographicIndicatorAlreadyExists);
    }

    Ok(())
}

pub fn generate(
    InsertDemographicIndicator {
        id,
        name,
        base_year,
        base_population,
        population_percentage,
        year_1_projection,
        year_2_projection,
        year_3_projection,
        year_4_projection,
        year_5_projection,
    }: InsertDemographicIndicator,
) -> DemographicIndicatorRow {
    DemographicIndicatorRow {
        id,
        name,
        base_year,
        base_population: base_population.unwrap_or_default(),
        population_percentage: population_percentage.unwrap_or_default(),
        year_1_projection: year_1_projection.unwrap_or_default(),
        year_2_projection: year_2_projection.unwrap_or_default(),
        year_3_projection: year_3_projection.unwrap_or_default(),
        year_4_projection: year_4_projection.unwrap_or_default(),
        year_5_projection: year_5_projection.unwrap_or_default(),
    }
}

impl From<RepositoryError> for InsertDemographicIndicatorError {
    fn from(error: RepositoryError) -> Self {
        InsertDemographicIndicatorError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertDemographicIndicatorError {
    fn from(error: SingleRecordError) -> Self {
        use InsertDemographicIndicatorError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
