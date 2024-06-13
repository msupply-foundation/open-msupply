use async_graphql::*;
use dataloader::DataLoader;

use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError, ContextExt};

use repository::vaccine_course::vaccine_course_item_row::VaccineCourseItemRow;

use super::ItemNode;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseItemNode {
    pub vaccine_course_item: VaccineCourseItemRow,
}

#[Object]
impl VaccineCourseItemNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    // pub async fn item_id(&self) -> &str {
    //     // TODO Look up item_id
    //     &self.row().item_link_id
    // }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.row().item_link_id.clone()).await?;

        let item = item_option.ok_or(
            StandardGraphqlError::InternalError(format!("Cannot find item {}", self.row().id,))
                .extend(),
        )?;

        Ok(ItemNode::from_domain(item))
    }
}

impl VaccineCourseItemNode {
    pub fn from_domain(vaccine_course_item: VaccineCourseItemRow) -> VaccineCourseItemNode {
        VaccineCourseItemNode {
            vaccine_course_item,
        }
    }

    pub fn row(&self) -> &VaccineCourseItemRow {
        &self.vaccine_course_item
    }
}
