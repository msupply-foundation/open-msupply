use repository::vaccine_course::vaccine_course::{VaccineCourseFilter, VaccineCourseRepository};
use repository::vaccine_course::vaccine_course_row::VaccineCourseRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VaccineCourseLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VaccineCourseLoader {
    type Value = VaccineCourseRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = VaccineCourseRepository::new(&connection);

        let result = repo
            .query_by_filter(VaccineCourseFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?
            .into_iter()
            .map(|course| {
                let id = course.id.clone();
                (id, course)
            })
            .collect();

        Ok(result)
    }
}
