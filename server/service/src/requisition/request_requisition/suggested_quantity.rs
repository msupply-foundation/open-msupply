use std::collections::HashMap;

use repository::RequisitionRow;
use serde::{Deserialize, Serialize};

use crate::plugin;

pub trait SuggestedQuantity: Send + Sync {
    fn suggested_quantity(&self, input: SuggestedQuantityInput) -> SuggestedQuantityByItem;
}

pub struct SuggestedQuantityDefault;

impl SuggestedQuantity for SuggestedQuantityDefault {
    fn suggested_quantity(
        &self,
        SuggestedQuantityInput { requisition, items }: SuggestedQuantityInput,
    ) -> SuggestedQuantityByItem {
        let RequisitionRow {
            min_months_of_stock,
            max_months_of_stock,
            ..
        } = requisition;

        items
            .into_iter()
            .map(|(item_id, suggest_quantity_stats)| {
                (
                    item_id,
                    SuggestionQuantityItem {
                        suggested_quantity: generate_single_suggested_quantity(
                            min_months_of_stock,
                            max_months_of_stock,
                            suggest_quantity_stats,
                        ),
                    },
                )
            })
            .collect()
    }
}

pub fn generate_suggested_quantity(input: SuggestedQuantityInput) -> SuggestedQuantityByItem {
    let default: Box<dyn SuggestedQuantity> = Box::new(SuggestedQuantityDefault);
    plugin(|p| {
        p.suggested_quantity
            .as_ref()
            .unwrap_or(&default)
            .suggested_quantity(input)
    })
}
#[derive(Clone, Deserialize, Serialize)]
pub struct GenerateSuggestedQuantity {
    pub average_monthly_consumption: f64,
    pub available_stock_on_hand: f64,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct SuggestedQuantityInput {
    pub requisition: RequisitionRow,
    pub items: HashMap<String /* item id */, GenerateSuggestedQuantity>,
}
#[derive(Clone, Deserialize, Serialize)]
pub struct SuggestionQuantityItem {
    pub suggested_quantity: f64,
}

pub type SuggestedQuantityByItem = HashMap<String /* item id */, SuggestionQuantityItem>;

fn generate_single_suggested_quantity(
    min_months_of_stock: f64,
    max_months_of_stock: f64,
    GenerateSuggestedQuantity {
        average_monthly_consumption,
        available_stock_on_hand,
    }: GenerateSuggestedQuantity,
) -> f64 {
    if average_monthly_consumption == 0.0 {
        return 0.0;
    }
    let months_of_stock = available_stock_on_hand / average_monthly_consumption;

    let default_min_months_of_stock = if min_months_of_stock == 0.0 {
        max_months_of_stock
    } else {
        min_months_of_stock
    };

    if max_months_of_stock == 0.0 || (months_of_stock > default_min_months_of_stock) {
        return 0.0;
    }

    (max_months_of_stock - months_of_stock) * average_monthly_consumption
}
