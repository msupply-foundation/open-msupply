use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    DemographicProjectionRow, DemographicProjectionRowRepository, RepositoryError,
    StorageConnection,
};

use super::{
    query_demographic_projection::get_demographic_projection,
    validate::{check_base_year_unique, check_demographic_projection_exists},
};
#[derive(PartialEq, Debug)]

pub enum UpdateDemographicProjectionError {
    DemographicProjectionBaseYearAlreadyExists,
    DemographicProjectionDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Debug, Default, Clone)]

pub struct UpdateDemographicProjection {
    pub id: String,
    pub base_year: Option<i32>,
    pub year_1: Option<i32>,
    pub year_2: Option<i32>,
    pub year_3: Option<i32>,
    pub year_4: Option<i32>,
    pub year_5: Option<i32>,
}

pub fn update_demographic_projection(
    ctx: &ServiceContext,
    input: UpdateDemographicProjection,
) -> Result<DemographicProjectionRow, UpdateDemographicProjectionError> {
    let demographic_projection = ctx
        .connection
        .transaction_sync(|connection| {
            let demographic_projection_row = validate(connection, &input)?;
            let updated_demographic_projection_row =
                generate(input.clone(), demographic_projection_row.clone());

            DemographicProjectionRowRepository::new(connection)
                .upsert_one(&updated_demographic_projection_row)?;
            // TODO add acitivity logs

            get_demographic_projection(ctx, updated_demographic_projection_row.id)
                .map_err(UpdateDemographicProjectionError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(demographic_projection)
}

pub fn validate(
    connection: &StorageConnection,
    input: &UpdateDemographicProjection,
) -> Result<DemographicProjectionRow, UpdateDemographicProjectionError> {
    let demographioc_projection_row =
        match check_demographic_projection_exists(&input.id, connection)? {
            Some(demographic_projection_row) => demographic_projection_row,
            None => {
                return Err(UpdateDemographicProjectionError::DemographicProjectionDoesNotExist)
            }
        };
    if let Some(base_year) = input.base_year {
        if !check_base_year_unique(base_year, connection)? {
            return Err(
                UpdateDemographicProjectionError::DemographicProjectionBaseYearAlreadyExists,
            );
        }
    }

    Ok(demographioc_projection_row)
}

pub fn generate(
    UpdateDemographicProjection {
        id: _,
        base_year,
        year_1,
        year_2,
        year_3,
        year_4,
        year_5,
    }: UpdateDemographicProjection,
    mut demographic_projection_row: DemographicProjectionRow,
) -> DemographicProjectionRow {
    if let Some(base_year) = base_year {
        demographic_projection_row.base_year = base_year;
    }
    if let Some(year_1) = year_1 {
        demographic_projection_row.year_1 = year_1;
    }
    if let Some(year_2) = year_2 {
        demographic_projection_row.year_2 = year_2;
    }
    if let Some(year_3) = year_3 {
        demographic_projection_row.year_3 = year_3;
    }
    if let Some(year_4) = year_4 {
        demographic_projection_row.year_4 = year_4;
    }
    if let Some(year_5) = year_5 {
        demographic_projection_row.year_5 = year_5;
    }
    demographic_projection_row
}

impl From<RepositoryError> for UpdateDemographicProjectionError {
    fn from(error: RepositoryError) -> Self {
        UpdateDemographicProjectionError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateDemographicProjectionError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateDemographicProjectionError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
