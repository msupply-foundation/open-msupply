use async_graphql::*;
use repository::vaccine_course::vaccine_course_store_wastage_row::VaccineCourseStoreWastageRow;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseStoreWastageNode {
    pub row: VaccineCourseStoreWastageRow,
}

#[Object]
impl VaccineCourseStoreWastageNode {
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
}

impl VaccineCourseStoreWastageNode {
    pub fn from_domain(row: VaccineCourseStoreWastageRow) -> VaccineCourseStoreWastageNode {
        VaccineCourseStoreWastageNode { row }
    }
}
