use repository::{
    DatetimeFilter, EqualFilter, Pagination, PaginationOption, RepositoryError, Sensor, SensorFilter, SensorRepository, SensorSort, Sort, StorageConnection, TemperatureBreachRowRepository, TemperatureBreachRowType, TemperatureLog, TemperatureLogFilter, TemperatureLogRepository, TemperatureLogSortField,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_sensors(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<SensorFilter>,
    sort: Option<SensorSort>,
) -> Result<ListResult<Sensor>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = SensorRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_sensor(ctx: &ServiceContext, id: String) -> Result<Sensor, SingleRecordError> {
    let repository = SensorRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(SensorFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_sensor_logs_for_breach(connection: &StorageConnection, breach_id: &String) -> Result<Vec<TemperatureLog>, RepositoryError> {
   
    let mut temperature_logs: Vec<TemperatureLog> = Vec::new();

    let breach_result = 
    TemperatureBreachRowRepository::new(connection).find_one_by_id(breach_id)?;

    if let Some(breach_record) = breach_result {
        
        if let Some(end_datetime) = breach_record.end_datetime {
            // Find all temperature logs in the breach time range, sorted by date/time
            
            let mut filter = TemperatureLogFilter::new()
                .sensor(SensorFilter::new().id(EqualFilter::equal_to(&breach_record.sensor_id)));
            let sort = Sort {
                key: TemperatureLogSortField::Datetime,
                desc: None,
            };

            match breach_record.r#type {
                TemperatureBreachRowType::ColdCumulative | TemperatureBreachRowType::HotCumulative => {
                    // Cumulative breach can include any time on the same day (can only be at most one per day)
                    let start_breach = breach_record.start_datetime.date().and_hms_opt(0, 0, 0).unwrap();
                    let end_breach = breach_record.start_datetime.date().and_hms_opt(23, 59, 59).unwrap();
                    filter = filter.datetime(DatetimeFilter::date_range(start_breach, end_breach));
                }
                TemperatureBreachRowType::ColdConsecutive | TemperatureBreachRowType::HotConsecutive => {
                    filter = filter.datetime(DatetimeFilter::date_range(breach_record.start_datetime, end_datetime));
                }
            }
               
            let log_result = TemperatureLogRepository::new(connection).query(Pagination::all(),Some(filter), Some(sort))?;
            
            for temperature_log in log_result {      
                // Add log to breach if temperature is outside breach parameters
                if (temperature_log.temperature_log_row.temperature > breach_record.threshold_maximum)
                 | (temperature_log.temperature_log_row.temperature < breach_record.threshold_minimum)      
                {
                   temperature_logs.push(temperature_log.clone());
                } 
            }
        } else {
            log::info!("Breach {:?} has no end time", breach_record);
        } 
        
        Ok(temperature_logs)
    } else {
        Err(RepositoryError::NotFound)
    }
}
