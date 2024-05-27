use repository::{
    DemographicProjectionRow, DemographicProjectionRowRepository, RepositoryError,
    StorageConnection,
};

use crate::{service_provider::ServiceContext, SingleRecordError};

use super::query_demographic_projection::get_demographic_projection;

#[derive(PartialEq, Debug)]
pub enum InsertDemographicProjectionError {
    DemographicProjectionAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone)]
pub struct InsertDemographicProjection {
    pub id: String,
    pub base_year: Option<i16>,
    pub year_1: Option<f64>,
    pub year_2: Option<f64>,
    pub year_3: Option<f64>,
    pub year_4: Option<f64>,
    pub year_5: Option<f64>,
}

pub fn insert_demographic_projection(
    ctx: &ServiceContext,
    input: InsertDemographicProjection,
) -> Result<DemographicProjectionRow, InsertDemographicProjectionError> {
    let demographic_projection = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;

            let new_demographic_projection = generate(input);
            DemographicProjectionRowRepository::new(connection)
                .upsert_one(&new_demographic_projection)?;

            // TODO add activity log entry

            get_demographic_projection(ctx, new_demographic_projection.id)
                .map_err(InsertDemographicProjectionError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(demographic_projection)
}

pub fn validate(
    _input: &InsertDemographicProjection,
    _connection: &StorageConnection,
) -> Result<(), InsertDemographicProjectionError> {
    // TODO add validation functionality if required in future
    Ok(())
}

pub fn generate(
    InsertDemographicProjection {
        id,
        base_year,
        year_1,
        year_2,
        year_3,
        year_4,
        year_5,
    }: InsertDemographicProjection,
) -> DemographicProjectionRow {
    DemographicProjectionRow {
        id,
        base_year: base_year.unwrap_or_default(),
        year_1: year_1.unwrap_or_default(),
        year_2: year_2.unwrap_or_default(),
        year_3: year_3.unwrap_or_default(),
        year_4: year_4.unwrap_or_default(),
        year_5: year_5.unwrap_or_default(),
    }
}

impl From<RepositoryError> for InsertDemographicProjectionError {
    fn from(error: RepositoryError) -> Self {
        InsertDemographicProjectionError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertDemographicProjectionError {
    fn from(error: SingleRecordError) -> Self {
        use InsertDemographicProjectionError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
