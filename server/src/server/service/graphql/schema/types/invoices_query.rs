use super::{
    DatetimeFilterInput, EqualFilterInput, EqualFilterStringInput, InvoiceNode, InvoiceStatusInput,
    InvoiceTypeInput, SimpleStringFilterInput, SortInput,
};

use crate::{
    database::repository::{
        DatetimeFilter, EqualFilter, InvoiceFilter, InvoiceQueryRepository, InvoiceSort,
        InvoiceSortField, SimpleStringFilter,
    },
    server::service::graphql::{schema::queries::pagination::Pagination, ContextExt},
};

use async_graphql::{Context, Enum, InputObject, Object};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "crate::database::repository::repository::InvoiceSortField")]
pub enum InvoiceSortFieldInput {
    Type,
    Status,
    EntryDatetime,
    ConfirmDatetime,
    FinalisedDateTime,
}
pub type InvoiceSortInput = SortInput<InvoiceSortFieldInput>;
#[derive(InputObject, Clone)]

pub struct InvoiceFilterInput {
    pub name_id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterInput<InvoiceTypeInput>>,
    pub status: Option<EqualFilterInput<InvoiceStatusInput>>,
    pub comment: Option<SimpleStringFilterInput>,
    pub their_reference: Option<EqualFilterStringInput>,
    pub entry_datetime: Option<DatetimeFilterInput>,
    pub confirm_datetime: Option<DatetimeFilterInput>,
    pub finalised_datetime: Option<DatetimeFilterInput>,
}

impl From<InvoiceFilterInput> for InvoiceFilter {
    fn from(f: InvoiceFilterInput) -> Self {
        InvoiceFilter {
            name_id: f.name_id.map(EqualFilter::from),
            store_id: f.store_id.map(EqualFilter::from),
            r#type: f.r#type.map(EqualFilter::from),
            status: f.status.map(EqualFilter::from),
            comment: f.comment.map(SimpleStringFilter::from),
            their_reference: f.their_reference.map(EqualFilter::from),
            entry_datetime: f.entry_datetime.map(DatetimeFilter::from),
            confirm_datetime: f.confirm_datetime.map(DatetimeFilter::from),
            finalised_datetime: f.finalised_datetime.map(DatetimeFilter::from),
        }
    }
}

pub struct InvoiceList {
    pub pagination: Option<Pagination>,
    pub filter: Option<InvoiceFilterInput>,
    pub sort: Option<Vec<InvoiceSortInput>>,
}

#[Object]
impl InvoiceList {
    async fn total_count(&self, ctx: &Context<'_>) -> i64 {
        let repository = ctx.get_repository::<InvoiceQueryRepository>();
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<InvoiceNode> {
        let repository = ctx.get_repository::<InvoiceQueryRepository>();

        let filter = self.filter.clone().map(InvoiceFilter::from);

        // Currently only one sort option is supported, use the first from the list.
        let first_sort = self
            .sort
            .as_ref()
            .map(|sort_list| sort_list.first())
            .flatten()
            .map(|opt| InvoiceSort {
                key: InvoiceSortField::from(opt.key),
                desc: opt.desc,
            });

        repository
            .all(&self.pagination, &filter, &first_sort)
            .map_or(Vec::<InvoiceNode>::new(), |list| {
                list.into_iter().map(InvoiceNode::from).collect()
            })
    }
}
