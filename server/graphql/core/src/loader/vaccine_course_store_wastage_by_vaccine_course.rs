use repository::vaccine_course::vaccine_course_store_wastage::{
    VaccineCourseStoreWastageFilter, VaccineCourseStoreWastageRepository,
};
use repository::vaccine_course::vaccine_course_store_wastage_row::VaccineCourseStoreWastageRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VaccineCourseStoreWastageByVaccineCourseIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VaccineCourseStoreWastageByVaccineCourseIdLoader {
    type Value = Vec<VaccineCourseStoreWastageRow>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = VaccineCourseStoreWastageRepository::new(&connection);

        let rows = repo.query_by_filter(
            VaccineCourseStoreWastageFilter::new()
                .vaccine_course_id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        let mut map: HashMap<String, Vec<VaccineCourseStoreWastageRow>> = HashMap::new();

        for row in rows {
            let id = row.vaccine_course_id.clone();
            let list = map.entry(id).or_default();
            list.push(row);
        }

        Ok(map)
    }
}
