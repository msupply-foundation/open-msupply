use chrono::{Days, Utc};
use repository::{
    DatetimeFilter, EqualFilter, RepositoryError, StorageConnection, TemperatureExcursion,
    TemperatureExcursionRepository, TemperatureLogFilter,
};

pub trait TemperatureExcursionServiceTrait: Sync + Send {
    fn get_excursions(
        &self,
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
}

pub struct TemperatureExcursionService {}
impl TemperatureExcursionServiceTrait for TemperatureExcursionService {}
