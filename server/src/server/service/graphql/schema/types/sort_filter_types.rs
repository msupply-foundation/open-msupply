use super::NameSortFieldInput;

use crate::database::repository::SimpleStringFilter;

use async_graphql::{InputObject, InputType};

#[derive(InputObject)]
#[graphql(concrete(name = "NameSortInput", params(NameSortFieldInput)))]
pub struct SortInput<T: InputType> {
    pub key: T,
    pub desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct SimpleStringFilterInput {
    equal_to: Option<String>,
    like: Option<String>,
}

impl From<SimpleStringFilterInput> for SimpleStringFilter {
    fn from(f: SimpleStringFilterInput) -> Self {
        SimpleStringFilter {
            equal_to: f.equal_to,
            like: f.like,
        }
    }
}
