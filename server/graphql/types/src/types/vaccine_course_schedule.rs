use async_graphql::*;

use repository::vaccine_course::vaccine_course_schedule_row::VaccineCourseScheduleRow;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseScheduleNode {
    pub vaccine_course_schedule: VaccineCourseScheduleRow,
}

#[Object]
impl VaccineCourseScheduleNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
}

impl VaccineCourseScheduleNode {
    pub fn from_domain(
        vaccine_course_schedule: VaccineCourseScheduleRow,
    ) -> VaccineCourseScheduleNode {
        VaccineCourseScheduleNode {
            vaccine_course_schedule,
        }
    }

    pub fn row(&self) -> &VaccineCourseScheduleRow {
        &self.vaccine_course_schedule
    }
}
