use async_graphql::*;

#[derive(InputObject)]
pub struct PriceInput {
    pub total_before_tax: Option<f64>,
    pub percentage: Option<f64>,
}
