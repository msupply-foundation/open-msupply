use crate::database::repository::{
    NameQueryFilter, NameQueryRepository, NameQuerySortField, NameQuerySortOption,
    NameQueryStringFilter,
};
use crate::server::service::graphql::{schema::queries::pagination::Pagination, ContextExt};
use async_graphql::{Context, Enum, InputObject, Object, SimpleObject};

#[derive(InputObject)]
pub struct NameSortOption {
    key: NameSortField,
    desc: Option<bool>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "crate::database::repository::repository::NameQuerySortField")]
enum NameSortField {
    Name,
    Code,
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
    pub filter: Option<NameQueryFilter>,
    pub sort: Option<NameSortOption>,
}

#[derive(InputObject)]
pub struct NameStringFilter {
    equal_to: Option<String>,
    like: Option<String>,
}

impl From<NameStringFilter> for NameQueryStringFilter {
    fn from(f: NameStringFilter) -> Self {
        NameQueryStringFilter {
            equal_to: f.equal_to,
            like: f.like,
        }
    }
}

#[derive(InputObject)]

pub struct NameFilter {
    pub name: Option<NameStringFilter>,
    pub code: Option<NameStringFilter>,
    pub is_customer: Option<bool>,
    pub is_supplier: Option<bool>,
}

impl From<NameFilter> for NameQueryFilter {
    fn from(f: NameFilter) -> Self {
        NameQueryFilter {
            name: f.name.map(NameQueryStringFilter::from),
            code: f.code.map(NameQueryStringFilter::from),
            is_customer: f.is_customer,
            is_supplier: f.is_supplier,
        }
    }
}

#[Object]
impl NameList {
    async fn total_count(&self, ctx: &Context<'_>) -> i64 {
        let repository = ctx.get_repository::<NameQueryRepository>();
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<NameQuery> {
        let repository = ctx.get_repository::<NameQueryRepository>();
        repository
            .all(
                &self.pagination,
                &self.filter,
                &self.sort.as_ref().map(|opt| NameQuerySortOption {
                    key: NameQuerySortField::from(opt.key),
                    desc: opt.desc,
                }),
            )
            .unwrap()
    }
}
