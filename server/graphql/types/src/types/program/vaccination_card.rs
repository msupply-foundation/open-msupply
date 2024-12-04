use async_graphql::*;

use chrono::NaiveDate;

use dataloader::DataLoader;
use graphql_core::{
    loader::{NameByIdLoader, NameByIdLoaderInput, StockLineByIdLoader},
    ContextExt,
};
use serde::Serialize;
use service::vaccination::get_vaccination_card::{
    VaccinationCard, VaccinationCardItem, VaccinationCardItemStatus,
};

use crate::types::StockLineNode;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VaccinationCardItemNodeStatus {
    Given,
    NotGiven,
    Pending,
    Late,
}

pub struct VaccinationCardNode {
    pub vaccination_card: VaccinationCard,
}

#[Object]
impl VaccinationCardNode {
    pub async fn id(&self) -> &str {
        &self.vaccination_card.enrolment.program_row.id
    }

    pub async fn program_name(&self) -> &str {
        &self.vaccination_card.enrolment.program_row.name
    }

    pub async fn patient_first_name(&self) -> &Option<String> {
        &self.vaccination_card.enrolment.patient_row.first_name
    }

    pub async fn patient_last_name(&self) -> &Option<String> {
        &self.vaccination_card.enrolment.patient_row.last_name
    }

    pub async fn enrolment_store_id(&self) -> &Option<String> {
        &self.vaccination_card.enrolment.row.store_id
    }

    pub async fn items(&self) -> Vec<VaccinationCardItemNode> {
        self.vaccination_card
            .items
            .iter()
            .map(|item| VaccinationCardItemNode::from_domain(item.clone()))
            .collect()
    }
}

impl VaccinationCardNode {
    pub fn from_domain(vaccination_card: VaccinationCard) -> VaccinationCardNode {
        VaccinationCardNode { vaccination_card }
    }
}

pub struct VaccinationCardItemNode {
    pub item: VaccinationCardItem,
}

#[Object]
impl VaccinationCardItemNode {
    pub async fn id(&self) -> &str {
        &self.item.row.id
    }
    pub async fn vaccine_course_id(&self) -> &str {
        &self.item.row.vaccine_course_id
    }
    pub async fn vaccine_course_dose_id(&self) -> &str {
        &self.item.row.vaccine_course_dose_id
    }
    pub async fn vaccination_id(&self) -> &Option<String> {
        &self.item.row.vaccination_id
    }
    pub async fn label(&self) -> &str {
        &self.item.row.label
    }
    pub async fn min_age_months(&self) -> &f64 {
        &self.item.row.min_age
    }
    pub async fn max_age_months(&self) -> &f64 {
        &self.item.row.max_age
    }
    pub async fn custom_age_label(&self) -> &Option<String> {
        &self.item.row.custom_age_label
    }
    pub async fn min_interval_days(&self) -> &i32 {
        &self.item.row.min_interval_days
    }
    pub async fn given(&self) -> &Option<bool> {
        &self.item.row.given
    }
    pub async fn vaccination_date(&self) -> &Option<NaiveDate> {
        &self.item.row.vaccination_date
    }
    pub async fn suggested_date(&self) -> &Option<NaiveDate> {
        &self.item.suggested_date
    }
    pub async fn status(&self) -> Option<VaccinationCardItemNodeStatus> {
        self.item
            .status
            .as_ref()
            .map(|status| VaccinationCardItemNodeStatus::from_domain(status))
    }

    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();

        let stock_line_id = match &self.item.row.stock_line_id {
            None => return Ok(None),
            Some(stock_line_id) => stock_line_id,
        };

        let result = loader.load_one(stock_line_id.clone()).await?;

        Ok(result.map(StockLineNode::from_domain))
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.item.row.batch
    }

    pub async fn facility_name(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Option<String>> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let facility_name_id = match &self.item.row.facility_name_id {
            Some(facility_name_id) => facility_name_id,
            None => {
                return Ok(self.item.row.facility_free_text.clone());
            }
        };

        let response_option = loader
            .load_one(NameByIdLoaderInput::new(&store_id, facility_name_id))
            .await?;

        Ok(match response_option {
            Some(response) => Some(response.name_row.name),
            None => None,
        })
    }
}

impl VaccinationCardItemNode {
    pub fn from_domain(vaccination_card_item: VaccinationCardItem) -> VaccinationCardItemNode {
        VaccinationCardItemNode {
            item: vaccination_card_item,
        }
    }
}

impl VaccinationCardItemNodeStatus {
    pub fn to_domain(self) -> VaccinationCardItemStatus {
        use VaccinationCardItemNodeStatus::*;
        match self {
            Given => VaccinationCardItemStatus::Given,
            NotGiven => VaccinationCardItemStatus::NotGiven,
            Pending => VaccinationCardItemStatus::Pending,
            Late => VaccinationCardItemStatus::Late,
        }
    }

    pub fn from_domain(status: &VaccinationCardItemStatus) -> VaccinationCardItemNodeStatus {
        use VaccinationCardItemStatus::*;
        match status {
            Given => VaccinationCardItemNodeStatus::Given,
            NotGiven => VaccinationCardItemNodeStatus::NotGiven,
            Pending => VaccinationCardItemNodeStatus::Pending,
            Late => VaccinationCardItemNodeStatus::Late,
        }
    }
}
