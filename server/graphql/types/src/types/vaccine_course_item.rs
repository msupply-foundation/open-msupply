use async_graphql::*;

use repository::{
    vaccine_course::{
        vaccine_course_item::VaccineCourseItem, vaccine_course_item_row::VaccineCourseItemRow,
    },
    ItemRow,
};

#[derive(PartialEq, Debug)]
pub struct VaccineCourseItemNode {
    pub vaccine_course_item: VaccineCourseItem,
}

#[Object]
impl VaccineCourseItemNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn item_id(&self) -> &str {
        &self.item_row().id
    }

    pub async fn name(&self) -> &str {
        &self.item_row().name
    }
}

impl VaccineCourseItemNode {
    pub fn from_domain(vaccine_course_item: VaccineCourseItem) -> VaccineCourseItemNode {
        VaccineCourseItemNode {
            vaccine_course_item,
        }
    }

    pub fn row(&self) -> &VaccineCourseItemRow {
        &self.vaccine_course_item.vaccine_course_item
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.vaccine_course_item.item
    }
}
