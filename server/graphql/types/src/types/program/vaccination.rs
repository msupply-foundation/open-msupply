use async_graphql::*;

use chrono::NaiveDate;
use dataloader::DataLoader;
use graphql_core::{
    loader::{InvoiceByIdLoader, StockLineByIdLoader},
    ContextExt,
};
use repository::{Vaccination, VaccinationRow};

use crate::types::{ClinicianNode, InvoiceNode, StockLineNode};

#[derive(PartialEq, Debug)]
pub struct VaccinationNode {
    pub vaccination: Vaccination,
}

#[Object]
impl VaccinationNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn vaccination_date(&self) -> &NaiveDate {
        &self.row().vaccination_date
    }

    pub async fn clinician_id(&self) -> &Option<String> {
        &self.row().clinician_link_id
    }

    pub async fn clinician(&self) -> Option<ClinicianNode> {
        self.vaccination
            .clinician_row
            .clone()
            .map(ClinicianNode::from_domain)
    }

    pub async fn given(&self) -> &bool {
        &self.row().given
    }

    pub async fn invoice_id(&self) -> &Option<String> {
        &self.row().invoice_id
    }

    pub async fn not_given_reason(&self) -> &Option<String> {
        &self.row().not_given_reason
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn facility_name(&self) -> Option<String> {
        match &self.vaccination.facility_name_row {
            Some(name_row) => Some(name_row.name.clone()),
            None => self.row().facility_free_text.clone(),
        }
    }

    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();

        let stock_line_id = match &self.row().stock_line_id {
            None => return Ok(None),
            Some(stock_line_id) => stock_line_id,
        };

        let result = loader.load_one(stock_line_id.clone()).await?;

        Ok(result.map(StockLineNode::from_domain))
    }

    pub async fn invoice(&self, ctx: &Context<'_>) -> Result<Option<InvoiceNode>> {
        let loader = ctx.get_loader::<DataLoader<InvoiceByIdLoader>>();

        let invoice_id = match &self.row().invoice_id {
            None => return Ok(None),
            Some(stock_line_id) => stock_line_id,
        };

        let result = loader.load_one(invoice_id.clone()).await?;

        Ok(result.map(InvoiceNode::from_domain))
    }
}

impl VaccinationNode {
    pub fn from_domain(vaccination: Vaccination) -> VaccinationNode {
        VaccinationNode { vaccination }
    }

    pub fn row(&self) -> &VaccinationRow {
        &self.vaccination.vaccination_row
    }
}
