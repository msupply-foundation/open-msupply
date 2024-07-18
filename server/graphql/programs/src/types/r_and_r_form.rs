use async_graphql::*;

use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_types::types::rnr_form::RnRFormNode;
use repository::{
    EqualFilter,
    //  RnRFormFilter, RnRFormRow, RnRFormSort, RnRFormSortField
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
    CreatedDate,
}

#[derive(InputObject)]
pub struct RnRFormSortInput {
    /// Sort query result by `key`
    key: RnRFormSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

// impl RnRFormSortInput {
//     pub fn to_domain(self) -> RnRFormSort {
//         let key = match self.key {
//             RnRFormSortFieldInput::Period => RnRFormSortField::Period,
//             RnRFormSortFieldInput::Program => RnRFormSortField::Program,
//             RnRFormSortFieldInput::CreatedDate => RnRFormSortField::CreatedDate,
//         };

//         RnRFormSort {
//             key,
//             desc: self.desc,
//         }
//     }
// }

#[derive(InputObject, Clone)]
pub struct RnRFormFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub period_id: Option<EqualFilterStringInput>,
    pub program_id: Option<EqualFilterStringInput>,
}
// impl From<RnRFormFilterInput> for RnRFormFilter {
//     fn from(f: RnRFormFilterInput) -> Self {
//         RnRFormFilter {
//             id: f.id.map(EqualFilter::from),
//             period_id: f.period_id.map(EqualFilter::from),
//             program_id: f.program_id.map(EqualFilter::from),
//         }
//     }
// }

impl RnRFormConnector {
    // pub fn from_domain(forms: ListResult<RnRFormRow>) -> RnRFormConnector {
    pub fn from_domain() -> RnRFormConnector {
        RnRFormConnector {
            // total_count: forms.count,
            // nodes: forms
            //     .rows
            //     .into_iter()
            //     .map(|row| RnRFormNode { rnr_form_row: row })
            //     .collect(),
            total_count: 1,
            nodes: vec![RnRFormNode {}],
        }
    }
}
