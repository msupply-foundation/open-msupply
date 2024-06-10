use async_graphql::*;

use repository::vaccine_course::vaccine_course_item_row::VaccineCourseItemRow;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseItemNode {
    pub vaccine_course: VaccineCourseItemRow,
}

#[Object]
impl VaccineCourseItemNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
}

impl VaccineCourseItemNode {
    pub fn from_domain(vaccine_course: VaccineCourseItemRow) -> VaccineCourseItemNode {
        VaccineCourseItemNode { vaccine_course }
    }

    pub fn row(&self) -> &VaccineCourseItemRow {
        &self.vaccine_course
    }
}
