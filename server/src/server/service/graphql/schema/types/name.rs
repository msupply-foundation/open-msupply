use crate::database::repository::{
    NameQueryFilter, NameQueryRepository, NameQuerySort, SimpleStringFilter,
};
use crate::server::service::graphql::{schema::queries::pagination::Pagination, ContextExt};
use async_graphql::{Context, Enum, InputObject, Object, SimpleObject};

use super::{SimpleStringFilterInput, SortInput};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "crate::database::repository::repository::NameQuerySortField")]
pub enum NameSortFieldInput {
    Name,
    Code,
}
pub type NameSortInput = SortInput<NameSortFieldInput>;

#[derive(InputObject, Clone)]

pub struct NameFilterInput {
    pub name: Option<SimpleStringFilterInput>,
    pub code: Option<SimpleStringFilterInput>,
    pub is_customer: Option<bool>,
    pub is_supplier: Option<bool>,
}

impl From<NameFilterInput> for NameQueryFilter {
    fn from(f: NameFilterInput) -> Self {
        NameQueryFilter {
            name: f.name.map(SimpleStringFilter::from),
            code: f.code.map(SimpleStringFilter::from),
            is_customer: f.is_customer,
            is_supplier: f.is_supplier,
        }
    }
}

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(name = "Name")]
pub struct NameQuery {
    pub id: String,
    pub name: String,
    pub code: String,
    // Below are from name_store_join
    pub is_customer: bool,
    pub is_supplier: bool,
}

pub struct NameList {
    pub pagination: Option<Pagination>,
    pub filter: Option<NameFilterInput>,
    pub sort: Option<Vec<NameSortInput>>,
}

#[Object]
impl NameList {
    async fn total_count(&self, ctx: &Context<'_>) -> i64 {
        let repository = ctx.get_repository::<NameQueryRepository>();
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<NameQuery> {
        let repository = ctx.get_repository::<NameQueryRepository>();

        let filter = self.filter.clone().map(NameQueryFilter::from);

        // Currently only one sort option is supported, use the first from the list.
        let first_sort = self
            .sort
            .as_ref()
            .map(|sort_list| sort_list.first())
            .flatten()
            .map(NameQuerySort::from);

        repository
            .all(&self.pagination, &filter, &first_sort)
            .unwrap()
    }
}
