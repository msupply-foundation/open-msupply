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

    pub async fn dose_number(&self) -> &i32 {
        &self.row().dose_number
    }

    pub async fn label(&self) -> &str {
        &self.row().label
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
