use repository::vaccine_course::vaccine_course::{VaccineCourseFilter, VaccineCourseRepository};
use repository::EqualFilter;
use repository::{
    vaccine_course::vaccine_course_row::VaccineCourseRow, Pagination, RepositoryError,
    StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VaccineCourseByProgramIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for VaccineCourseByProgramIdLoader {
    type Value = Vec<VaccineCourseRow>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = VaccineCourseRepository::new(&connection);

        let vaccine_courses = repo.query(
            Pagination::all(),
            Some(VaccineCourseFilter::new().program_id(EqualFilter::equal_any(ids.to_owned()))),
            None,
        )?;

        let mut map: HashMap<String, Vec<VaccineCourseRow>> = HashMap::new();

        for vaccine_course in vaccine_courses {
            let id = vaccine_course.program_id.clone();
            let list = map
                .entry(id)
                .or_insert_with(|| Vec::<VaccineCourseRow>::new());
            list.push(vaccine_course);
        }

        Ok(map)
    }
}
