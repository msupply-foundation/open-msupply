use async_graphql::*;

#[derive(InputObject)]
pub struct TaxUpdate {
    /// Set or unset the tax value (in percentage)
    pub percentage: Option<f64>,
}
