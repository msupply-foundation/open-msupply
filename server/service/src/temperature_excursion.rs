use chrono::{Days, Utc};
use repository::{
    DatetimeFilter, EqualFilter, RepositoryError, StorageConnection, TemperatureExcursion,
    TemperatureExcursionRepository, TemperatureLogFilter,
};

pub fn get_excursions(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Vec<TemperatureExcursion>, RepositoryError> {
    let filter = TemperatureLogFilter::new()
        .store_id(EqualFilter::equal_to(store_id))
        .datetime(DatetimeFilter::after_or_equal_to(
            Utc::now()
                .naive_utc()
                .checked_sub_days(Days::new(7))
                .unwrap(),
        ));

    TemperatureExcursionRepository::new(&connection).query(filter)
}
