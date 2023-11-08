use async_graphql::*;

#[derive(InputObject)]
pub struct TaxInput {
    /// Set or unset the tax value (in percentage)
    pub percentage: Option<f64>,
}
