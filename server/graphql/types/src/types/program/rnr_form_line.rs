use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError, ContextExt};
use repository::{RnRFormLineRow, RnRFormLowStock};
use serde::Serialize;

use crate::types::ItemNode;

pub struct RnRFormLineNode {
    pub rnr_form_line_row: RnRFormLineRow,
}

#[Object]
impl RnRFormLineNode {
    pub async fn id(&self) -> &str {
        &self.rnr_form_line_row.id
    }

    pub async fn rnr_form_id(&self) -> &str {
        &self.rnr_form_line_row.rnr_form_id
    }

    pub async fn item_id(&self) -> &str {
        &self.rnr_form_line_row.item_id
    }

    pub async fn previous_monthly_consumption_values(&self) -> &str {
        &self.rnr_form_line_row.previous_monthly_consumption_values
    }

    pub async fn average_monthly_consumption(&self) -> f64 {
        self.rnr_form_line_row.average_monthly_consumption
    }

    pub async fn initial_balance(&self) -> f64 {
        self.rnr_form_line_row.initial_balance
    }
    pub async fn quantity_received(&self) -> f64 {
        self.rnr_form_line_row
            .entered_quantity_received
            .unwrap_or(self.rnr_form_line_row.snapshot_quantity_received)
    }
    pub async fn quantity_consumed(&self) -> f64 {
        self.rnr_form_line_row
            .entered_quantity_consumed
            .unwrap_or(self.rnr_form_line_row.snapshot_quantity_consumed)
    }

    pub async fn adjusted_quantity_consumed(&self) -> f64 {
        self.rnr_form_line_row.adjusted_quantity_consumed
    }

    pub async fn adjustments(&self) -> f64 {
        self.rnr_form_line_row
            .entered_adjustments
            .unwrap_or(self.rnr_form_line_row.snapshot_adjustments)
    }

    pub async fn stock_out_duration(&self) -> i32 {
        self.rnr_form_line_row.stock_out_duration
    }

    pub async fn final_balance(&self) -> f64 {
        self.rnr_form_line_row.final_balance
    }

    pub async fn maximum_quantity(&self) -> f64 {
        self.rnr_form_line_row.maximum_quantity
    }

    pub async fn expiry_date(&self) -> Option<NaiveDate> {
        self.rnr_form_line_row.expiry_date
    }

    pub async fn calculated_requested_quantity(&self) -> f64 {
        self.rnr_form_line_row.calculated_requested_quantity
    }

    pub async fn low_stock(&self) -> LowStockStatus {
        LowStockStatus::from_domain(&self.rnr_form_line_row.low_stock)
    }

    pub async fn entered_requested_quantity(&self) -> Option<f64> {
        self.rnr_form_line_row.entered_requested_quantity
    }

    pub async fn comment(&self) -> Option<String> {
        self.rnr_form_line_row.comment.clone()
    }

    pub async fn confirmed(&self) -> bool {
        self.rnr_form_line_row.confirmed
    }

    pub async fn approved_quantity(&self) -> Option<f64> {
        // TODO: Join on requisition to get approved quantity
        None
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader
            .load_one(self.rnr_form_line_row.item_id.clone())
            .await?;

        let item = item_option.ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item {} for RnR form line {}",
                self.rnr_form_line_row.item_id, self.rnr_form_line_row.id
            ))
            .extend(),
        )?;

        Ok(ItemNode::from_domain(item))
    }
}

impl RnRFormLineNode {
    pub fn from_domain(rnr_form_line_row: RnRFormLineRow) -> RnRFormLineNode {
        RnRFormLineNode { rnr_form_line_row }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum LowStockStatus {
    BelowQuarter,
    BelowHalf,
    Ok,
}
impl LowStockStatus {
    pub fn from_domain(low_stock: &RnRFormLowStock) -> Self {
        match low_stock {
            RnRFormLowStock::BelowQuarter => LowStockStatus::BelowQuarter,
            RnRFormLowStock::BelowHalf => LowStockStatus::BelowHalf,
            RnRFormLowStock::Ok => LowStockStatus::Ok,
        }
    }

    pub fn to_domain(self) -> RnRFormLowStock {
        match self {
            LowStockStatus::BelowQuarter => RnRFormLowStock::BelowQuarter,
            LowStockStatus::BelowHalf => RnRFormLowStock::BelowHalf,
            LowStockStatus::Ok => RnRFormLowStock::Ok,
        }
    }
}
