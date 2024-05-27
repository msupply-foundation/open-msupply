use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{DemographicIndicatorRow, RepositoryError, StorageConnection};

use super::{
    query_demographic_indicator::get_demographic_indicator,
    validate::check_demographic_indicator_exists,
};
#[derive(PartialEq, Debug)]

pub enum UpdateDemographicIndicatorError {
    DemographicIndicatorDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Debug, Default, Clone)]

pub struct UpdateDemographicIndicator {
    pub id: String,
    pub name: Option<String>,
    pub base_year: Option<i16>,
    pub base_population: Option<f64>,
    pub population_percentage: Option<f64>,
    pub year_1_projection: Option<f64>,
    pub year_2_projection: Option<f64>,
    pub year_3_projection: Option<f64>,
    pub year_4_projection: Option<f64>,
    pub year_5_projection: Option<f64>,
}

pub fn update_demographic_indicator(
    ctx: &ServiceContext,
    input: UpdateDemographicIndicator,
) -> Result<DemographicIndicatorRow, UpdateDemographicIndicatorError> {
    let demographic_indicator = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let demographic_indicator_row = validate(connection, &input)?;
            let updated_demographic_indicator_row =
                generate(input.clone(), demographic_indicator_row.clone());
            // TODO add acitivity logs

            get_demographic_indicator(ctx, updated_demographic_indicator_row.id)
                .map_err(UpdateDemographicIndicatorError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(demographic_indicator)
}

pub fn validate(
    connection: &StorageConnection,
    input: &UpdateDemographicIndicator,
) -> Result<DemographicIndicatorRow, UpdateDemographicIndicatorError> {
    let demographioc_indicator_row =
        match check_demographic_indicator_exists(&input.id, connection)? {
            Some(demographic_indicator_row) => demographic_indicator_row,
            None => return Err(UpdateDemographicIndicatorError::DemographicIndicatorDoesNotExist),
        };

    Ok(demographioc_indicator_row)
}

pub fn generate(
    UpdateDemographicIndicator {
        id: _,
        name,
        base_year,
        population_percentage,
        year_1_projection,
        year_2_projection,
        year_3_projection,
        year_4_projection,
        year_5_projection,
        base_population,
    }: UpdateDemographicIndicator,
    mut demographic_indicator_row: DemographicIndicatorRow,
) -> DemographicIndicatorRow {
    if let Some(name) = name {
        demographic_indicator_row.name = name;
    }
    if let Some(base_year) = base_year {
        demographic_indicator_row.base_year = base_year;
    }
    if let Some(base_population) = base_population {
        demographic_indicator_row.base_population = base_population;
    }
    if let Some(population_percentage) = population_percentage {
        demographic_indicator_row.population_percentage = population_percentage;
    }
    if let Some(year_1_projection) = year_1_projection {
        demographic_indicator_row.year_1_projection = year_1_projection;
    }
    if let Some(year_2_projection) = year_2_projection {
        demographic_indicator_row.year_2_projection = year_2_projection;
    }
    if let Some(year_3_projection) = year_3_projection {
        demographic_indicator_row.year_3_projection = year_3_projection;
    }
    if let Some(year_4_projection) = year_4_projection {
        demographic_indicator_row.year_4_projection = year_4_projection;
    }
    if let Some(year_5_projection) = year_5_projection {
        demographic_indicator_row.year_5_projection = year_5_projection;
    }
    demographic_indicator_row
}

impl From<RepositoryError> for UpdateDemographicIndicatorError {
    fn from(error: RepositoryError) -> Self {
        UpdateDemographicIndicatorError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateDemographicIndicatorError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateDemographicIndicatorError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
