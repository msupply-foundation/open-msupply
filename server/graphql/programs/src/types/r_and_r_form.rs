use async_graphql::*;

use graphql_core::generic_filters::{DatetimeFilterInput, EqualFilterStringInput};
use graphql_types::types::rnr_form::RnRFormNode;
use repository::{
    DatetimeFilter, EqualFilter, RnRForm, RnRFormFilter, RnRFormSort, RnRFormSortField,
};
use service::ListResult;

#[derive(SimpleObject)]
pub struct RnRFormConnector {
    pub total_count: u32,
    pub nodes: Vec<RnRFormNode>,
}

#[derive(Union)]
pub enum RnRFormsResponse {
    Response(RnRFormConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum RnRFormSortFieldInput {
    Period,
    Program,
    CreatedDatetime,
    Status,
    SupplierName,
}

#[derive(InputObject)]
pub struct RnRFormSortInput {
    /// Sort query result by `key`
    key: RnRFormSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl RnRFormSortInput {
    pub fn to_domain(self) -> RnRFormSort {
        let key = match self.key {
            RnRFormSortFieldInput::Period => RnRFormSortField::Period,
            RnRFormSortFieldInput::Program => RnRFormSortField::Program,
            RnRFormSortFieldInput::CreatedDatetime => RnRFormSortField::CreatedDatetime,
            RnRFormSortFieldInput::Status => RnRFormSortField::Status,
            RnRFormSortFieldInput::SupplierName => RnRFormSortField::SupplierName,
        };

        RnRFormSort {
            key,
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct RnRFormFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub store_id: Option<EqualFilterStringInput>,
}
impl From<RnRFormFilterInput> for RnRFormFilter {
    fn from(f: RnRFormFilterInput) -> Self {
        RnRFormFilter {
            id: f.id.map(EqualFilter::from),
            created_datetime: f.created_datetime.map(DatetimeFilter::from),
            store_id: f.store_id.map(EqualFilter::from),
            // TODO
            ..Default::default()
        }
    }
}

impl RnRFormConnector {
    pub fn from_domain(forms: ListResult<RnRForm>) -> RnRFormConnector {
        RnRFormConnector {
            total_count: forms.count,
            nodes: forms
                .rows
                .into_iter()
                .map(
                    |RnRForm {
                         rnr_form_row,
                         name_row,
                         period_row,
                         program_row,
                         store_row: _,
                     }| RnRFormNode {
                        rnr_form_row,
                        program_row,
                        period_row,
                        supplier_row: name_row,
                    },
                )
                .collect(),
        }
    }
}
