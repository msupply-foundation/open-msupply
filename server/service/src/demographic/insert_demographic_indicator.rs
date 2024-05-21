use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    DemographicIndicatorRow, DemographicIndicatorRowRepository, RepositoryError, StorageConnection,
};

use super::query_demographic_indicator::get_demographic_indicator;

#[derive(PartialEq, Debug)]
pub enum InsertDemographicIndicatorError {
    AssetAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone)]
pub struct InsertDemographicIndicator {
    pub id: String,
    pub name: Option<String>,
    pub population_percentage: Option<f64>,
    pub year_1_projection: Option<f64>,
    pub year_2_projection: Option<f64>,
    pub year_3_projection: Option<f64>,
    pub year_4_projection: Option<f64>,
    pub year_5_projection: Option<f64>,
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
    Ok(demographic_indicator.demographic_indicator_row)
}

pub fn validate(
    _input: &InsertDemographicIndicator,
    _connection: &StorageConnection,
) -> Result<(), InsertDemographicIndicatorError> {
    // TODO add validation functionality if requirtedd
    Ok(())
}

pub fn generate(
    InsertDemographicIndicator {
        id,
        name,
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
        name: name.unwrap_or_default(),
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
