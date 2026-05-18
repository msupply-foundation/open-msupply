use repository::vaccine_course::vaccine_course_dose::{
    VaccineCourseDoseFilter, VaccineCourseDoseRepository,
};
use repository::vaccine_course::vaccine_course_dose_row::VaccineCourseDoseRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VaccineCourseDoseByVaccineCourseIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VaccineCourseDoseByVaccineCourseIdLoader {
    type Value = Vec<VaccineCourseDoseRow>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<VaccineCourseDoseRow>>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = VaccineCourseDoseRepository::new(&connection);

                let doses = repo.query_by_filter(
                    VaccineCourseDoseFilter::new()
                        .vaccine_course_id(EqualFilter::equal_any(ids)),
                )?;

                let mut map: HashMap<String, Vec<VaccineCourseDoseRow>> = HashMap::new();

                for dose in doses {
                    let dose = dose.vaccine_course_dose_row;
                    let id = dose.vaccine_course_id.clone();
                    let list = map.entry(id).or_default();
                    list.push(dose);
                }

                Ok(map)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
