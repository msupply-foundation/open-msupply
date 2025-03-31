use super::{warning_row::warning, StorageConnection};
use super::{ItemLinkRow, ItemRow, WarningRow};

use crate::diesel_macros::apply_equal_filter;

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default, PartialEq, Debug)]
pub struct WarningFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
}

pub type Warning = WarningRow;

type WarningJoin = (WarningRow, (ItemLinkRow, ItemRow));

pub struct WarningRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> WarningRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        WarningRepository { connection }
    }

    pub fn count(&self, filter: Option<WarningFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: WarningFilter) -> Result<Vec<Warning>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query_one(&self, filter: WarningFilter) -> Result<Option<Warning>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(&self, filter: Option<WarningFilter>) -> Result<Vec<Warning>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        query = query.order(warning::id.asc());

        let result = query.load::<Warning>(self.connection.lock().connection())?; //WarningJoin?

        // Ok(result.into_iter().map(Warning::from_join).collect())
        // Ok(result.into_iter().map(to_domain).collect())
        Ok(result)
    }
}

// fn to_domain((warning_row, (_, item_row)): WarningJoin) -> Warning {
//     Warning {
//         id,
//         warning_text: todo!(),
//         code: todo!(),
//     }
// }

// impl Name {
//     pub fn from_join(
//         (warning_row, (_item_warning_link_row, name_store_join_row, store_row), name_oms_fields): NameAndNameStoreJoin,
//     ) -> Name {
//         Name {
//             warning_row,
//             name_store_join_row,
//             store_row,
//             properties: name_oms_fields.properties,
//         }
//     }

//     pub fn custom_data(&self) -> Result<Option<serde_json::Value>, serde_json::Error> {
//         self.name_row
//             .custom_data_string
//             .as_ref()
//             .map(|custom_data_string| serde_json::from_str(custom_data_string))
//             .transpose()
//     }
// }

type BoxedWarningQuery = IntoBoxed<'static, warning::table, DBType>;
// IntoBoxed<'static, InnerJoin<warning::table, InnerJoin<item_link::table, item::table>>, DBType>;

fn create_filtered_query(filter: Option<WarningFilter>) -> BoxedWarningQuery {
    let mut query = warning::table
        // .inner_join(item_link::table.inner_join(item::table))
        .into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, warning::id);
        // apply_equal_filter!(query, filter.item_id, item::id);
    }

    query
}

impl WarningFilter {
    pub fn new() -> WarningFilter {
        WarningFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    // pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
    //     self.item_id = Some(filter);
    //     self
    // }
}
