use async_graphql::*;
use repository::vaccine_course::vaccine_course_store_config_row::VaccineCourseStoreConfigRow;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseStoreConfigNode {
    pub row: VaccineCourseStoreConfigRow,
}

#[Object]
impl VaccineCourseStoreConfigNode {
    pub async fn id(&self) -> &str {
        &self.row.id
    }

    pub async fn vaccine_course_id(&self) -> &str {
        &self.row.vaccine_course_id
    }

    pub async fn store_id(&self) -> &str {
        &self.row.store_id
    }

    pub async fn wastage_rate(&self) -> Option<f64> {
        self.row.wastage_rate
    }

    pub async fn coverage_rate(&self) -> Option<f64> {
        self.row.coverage_rate
    }
}

impl VaccineCourseStoreConfigNode {
    pub fn from_domain(row: VaccineCourseStoreConfigRow) -> VaccineCourseStoreConfigNode {
        VaccineCourseStoreConfigNode { row }
    }
}
