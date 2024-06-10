use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    DemographicIndicatorRow, DemographicIndicatorRowRepository, RepositoryError, StorageConnection,
};

use super::{
    query_demographic_indicator::get_demographic_indicator,
    validate::{check_demographic_indicator_exists, check_year_name_combination_unique},
};
#[derive(PartialEq, Debug)]

pub enum UpdateDemographicIndicatorError {
    DemographicIndicatorAlreadyExistsForThisYear,
    DemographicIndicatorDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Debug, Default, Clone)]

pub struct UpdateDemographicIndicator {
    pub id: String,
    pub name: Option<String>,
    pub base_year: Option<i32>,
    pub base_population: Option<i32>,
    pub population_percentage: Option<f64>,
    pub year_1_projection: Option<i32>,
    pub year_2_projection: Option<i32>,
    pub year_3_projection: Option<i32>,
    pub year_4_projection: Option<i32>,
    pub year_5_projection: Option<i32>,
}

pub fn update_demographic_indicator(
    ctx: &ServiceContext,
    input: UpdateDemographicIndicator,
) -> Result<DemographicIndicatorRow, UpdateDemographicIndicatorError> {
    let demographic_indicator = ctx
        .connection
        .transaction_sync(|connection| {
            let demographic_indicator_row = validate(connection, &input)?;
            let updated_demographic_indicator_row =
                generate(input.clone(), demographic_indicator_row.clone());
            DemographicIndicatorRowRepository::new(connection)
                .upsert_one(&updated_demographic_indicator_row)?;
            // TODO add activity logs
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
    let demographic_indicator_row = match check_demographic_indicator_exists(&input.id, connection)?
    {
        Some(demographic_indicator_row) => demographic_indicator_row,
        None => return Err(UpdateDemographicIndicatorError::DemographicIndicatorDoesNotExist),
    };
    let base_year = match input.base_year {
        Some(base_year) => base_year,
        None => demographic_indicator_row.base_year,
    };

    let name = match &input.name {
        Some(name) => name,
        None => &demographic_indicator_row.name,
    };

    let id = &input.id;

    if !check_year_name_combination_unique(name, base_year, id, connection)? {
        return Err(UpdateDemographicIndicatorError::DemographicIndicatorAlreadyExistsForThisYear);
    }

    Ok(demographic_indicator_row)
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
