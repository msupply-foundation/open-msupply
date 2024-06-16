use repository::vaccine_course::vaccine_course_schedule::{
    VaccineCourseScheduleFilter, VaccineCourseScheduleRepository,
};
use repository::vaccine_course::vaccine_course_schedule_row::VaccineCourseScheduleRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct VaccineCourseScheduleByVaccineCourseIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for VaccineCourseScheduleByVaccineCourseIdLoader {
    type Value = Vec<VaccineCourseScheduleRow>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = VaccineCourseScheduleRepository::new(&connection);

        let schedules = repo.query_by_filter(
            VaccineCourseScheduleFilter::new()
                .vaccine_course_id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        let mut map: HashMap<String, Vec<VaccineCourseScheduleRow>> = HashMap::new();

        for schedule in schedules {
            let id = schedule.vaccine_course_id.clone();
            let list = map.entry(id).or_default();
            list.push(schedule);
        }

        Ok(map)
    }
}
