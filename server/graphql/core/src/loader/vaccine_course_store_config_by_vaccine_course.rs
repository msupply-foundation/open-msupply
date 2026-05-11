use repository::vaccine_course::vaccine_course_store_config::{
    VaccineCourseStoreConfigFilter, VaccineCourseStoreConfigRepository,
};
use repository::vaccine_course::vaccine_course_store_config_row::VaccineCourseStoreConfigRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VaccineCourseStoreConfigByVaccineCourseIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VaccineCourseStoreConfigByVaccineCourseIdLoader {
    type Value = Vec<VaccineCourseStoreConfigRow>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = VaccineCourseStoreConfigRepository::new(&connection);

        let rows = repo.query_by_filter(
            VaccineCourseStoreConfigFilter::new()
                .vaccine_course_id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        let mut map: HashMap<String, Vec<VaccineCourseStoreConfigRow>> = HashMap::new();

        for row in rows {
            let id = row.vaccine_course_id.clone();
            let list = map.entry(id).or_default();
            list.push(row);
        }

        Ok(map)
    }
}
