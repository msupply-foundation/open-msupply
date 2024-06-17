use repository::vaccine_course::vaccine_course_item::{
    VaccineCourseItem, VaccineCourseItemFilter, VaccineCourseItemRepository,
};
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VaccineCourseItemByVaccineCourseIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for VaccineCourseItemByVaccineCourseIdLoader {
    type Value = Vec<VaccineCourseItem>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = VaccineCourseItemRepository::new(&connection);

        let items = repo.query_by_filter(
            VaccineCourseItemFilter::new()
                .vaccine_course_id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        let mut map: HashMap<String, Vec<VaccineCourseItem>> = HashMap::new();

        for item in items {
            let id = item.vaccine_course_item.vaccine_course_id.clone();
            let list = map.entry(id).or_default();
            list.push(item);
        }

        Ok(map)
    }
}
