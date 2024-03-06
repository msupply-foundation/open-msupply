use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{generic_filters::EqualFilterStringInput, simple_generic_errors::NodeError};

use repository::{
    Currency, CurrencyFilter, CurrencyRow, CurrencySort, CurrencySortField, EqualFilter,
};

use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum CurrencySortFieldInput {
    Id,
    CurrencyCode,
    IsHomeCurrency,
}
#[derive(InputObject)]
pub struct CurrencySortInput {
    /// Sort query result by `key`
    key: CurrencySortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct CurrencyFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub is_home_currency: Option<bool>,
}

impl CurrencyFilterInput {
    pub fn to_domain(self) -> CurrencyFilter {
        let CurrencyFilterInput {
            id,
            is_home_currency,
        } = self;

        CurrencyFilter {
            id: id.map(EqualFilter::from),
            is_home_currency,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct CurrencyNode {
    pub currency: Currency,
}

#[derive(SimpleObject)]
pub struct CurrencyConnector {
    total_count: u32,
    nodes: Vec<CurrencyNode>,
}

#[Object]
impl CurrencyNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn rate(&self) -> f64 {
        self.row().rate
    }

    pub async fn is_home_currency(&self) -> bool {
        self.row().is_home_currency
    }

    pub async fn date_updated(&self) -> Option<NaiveDate> {
        self.row().date_updated
    }
}

#[derive(Union)]
pub enum CurrenciesResponse {
    Response(CurrencyConnector),
}

#[derive(Union)]
pub enum CurrencyResponse {
    Error(NodeError),
    Response(CurrencyNode),
}

impl CurrencyNode {
    pub fn from_domain(currency: Currency) -> CurrencyNode {
        CurrencyNode { currency }
    }

    pub fn row(&self) -> &CurrencyRow {
        &self.currency.currency_row
    }
}

impl CurrencyConnector {
    pub fn from_domain(currencies: ListResult<Currency>) -> CurrencyConnector {
        CurrencyConnector {
            total_count: currencies.count,
            nodes: currencies
                .rows
                .into_iter()
                .map(CurrencyNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(currencies: Vec<Currency>) -> CurrencyConnector {
        CurrencyConnector {
            total_count: usize_to_u32(currencies.len()),
            nodes: currencies
                .into_iter()
                .map(CurrencyNode::from_domain)
                .collect(),
        }
    }
}

impl CurrencySortInput {
    pub fn to_domain(self) -> CurrencySort {
        use CurrencySortField as to;
        use CurrencySortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::CurrencyCode => to::CurrencyCode,
            from::IsHomeCurrency => to::IsHomeCurrency,
        };

        CurrencySort {
            key,
            desc: self.desc,
        }
    }
}
