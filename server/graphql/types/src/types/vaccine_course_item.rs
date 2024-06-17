use async_graphql::*;
use dataloader::DataLoader;

use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError, ContextExt};

use repository::vaccine_course::vaccine_course_item::VaccineCourseItem;

use super::ItemNode;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseItemNode {
    pub vaccine_course_item: VaccineCourseItem,
}

#[Object]
impl VaccineCourseItemNode {
    pub async fn id(&self) -> &str {
        &self.row().vaccine_course_item.id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.row().item.id.clone()).await?;

        let item = item_option.ok_or(
            StandardGraphqlError::InternalError(
                format!("Cannot find item {}", self.row().item.id,),
            )
            .extend(),
        )?;

        Ok(ItemNode::from_domain(item))
    }
}

impl VaccineCourseItemNode {
    pub fn from_domain(vaccine_course_item: VaccineCourseItem) -> VaccineCourseItemNode {
        VaccineCourseItemNode {
            vaccine_course_item,
        }
    }

    pub fn row(&self) -> &VaccineCourseItem {
        &self.vaccine_course_item
    }
}
