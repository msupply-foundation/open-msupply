use async_graphql::*;
use service::report::data_sort_inputs::DataSort;

#[derive(InputObject)]
pub struct TaxInput {
    /// Set or unset the tax value (in percentage)
    pub percentage: Option<f64>,
}

#[derive(InputObject)]
pub struct DataSortInput {
    /// Sort query result by `key`
    pub key: String,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    pub desc: Option<bool>,
}

impl DataSortInput {
    /// Convert the input object `DataSortInput` to domain `DataSort` object
    pub fn to_domain(self) -> DataSort {
        DataSort {
            key: self.key,
            desc: self.desc,
        }
    }
}
