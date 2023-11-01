use async_graphql::*;
use service::report::definition::PrintReportSort;

#[derive(InputObject)]
pub struct TaxInput {
    /// Set or unset the tax value (in percentage)
    pub percentage: Option<f64>,
}

/// This struct is used to sort report data by a key and in descending or ascending order
#[derive(InputObject)]
pub struct PrintReportSortInput {
    /// Sort query result by `key`
    pub key: String,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    pub desc: Option<bool>,
}

impl PrintReportSortInput {
    /// Convert the input object `PrintReportSortInput` to a domain object `PrintReportSort`
    pub fn to_domain(self) -> PrintReportSort {
        PrintReportSort {
            key: self.key,
            desc: self.desc,
        }
    }
}
