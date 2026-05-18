use repository::vaccine_course::vaccine_course::{VaccineCourseFilter, VaccineCourseRepository};
use repository::vaccine_course::vaccine_course_row::VaccineCourseRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

/**
Includes deleted vaccine courses in the response,
to support Vaccine Card displaying existing vaccinations.
*/
pub struct VaccineCourseLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VaccineCourseLoader {
    type Value = VaccineCourseRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, VaccineCourseRow>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = VaccineCourseRepository::new(&connection);

                let result = repo
                    .query_by_filter(
                        VaccineCourseFilter::new()
                            .id(EqualFilter::equal_any(ids))
                            .include_deleted(true),
                    )?
                    .into_iter()
                    .map(|course| {
                        let id = course.id.clone();
                        (id, course)
                    })
                    .collect();

                Ok(result)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
