use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

use crate::{diesel_macros::apply_equal_filter, RepositoryError};

use super::{
    contact_form_row::{contact_form, ContactFormRow},
    name_link_row::name_link,
    name_row::name,
    store_row::store,
    DBType, EqualFilter, NameLinkRow, NameRow, Pagination, StorageConnection, StoreRow,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct ContactForm {
    pub contact_form_row: ContactFormRow,
    pub store_row: StoreRow,
    pub name_row: NameRow,
}

#[derive(Clone, Default)]
pub struct ContactFormFilter {
    pub id: Option<EqualFilter<String>>,
}

impl ContactFormFilter {
    pub fn new() -> ContactFormFilter {
        ContactFormFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
}

pub type ContactFormJoin = (ContactFormRow, (StoreRow, (NameLinkRow, NameRow)));

pub struct ContactFormRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ContactFormRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ContactFormRepository { connection }
    }

    pub fn query_one(
        &self,
        filter: ContactFormFilter,
    ) -> Result<Option<ContactForm>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ContactFormFilter,
    ) -> Result<Vec<ContactForm>, RepositoryError> {
        self.query(Pagination::new(), Some(filter))
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ContactFormFilter>,
    ) -> Result<Vec<ContactForm>, RepositoryError> {
        let query = create_filtered_query(filter);

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        //println!(
        //    "{}",
        //    diesel::debug_query::<DBType, _>(&final_query).to_string()
        //);
        let result = final_query
            .load::<ContactFormJoin>(self.connection.lock().connection())?
            .into_iter()
            .map(
                |(contact_form_row, (store_row, (_, name_row)))| ContactForm {
                    contact_form_row,
                    store_row,
                    name_row,
                },
            )
            .collect();

        Ok(result)
    }
}

type BoxedContactFormQuery = IntoBoxed<
    'static,
    InnerJoin<
        contact_form::table,
        InnerJoin<store::table, InnerJoin<name_link::table, name::table>>,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<ContactFormFilter>) -> BoxedContactFormQuery {
    let mut query = contact_form::table
        .inner_join(store::table.inner_join(name_link::table.inner_join(name::table)))
        // removed for now while user_accounts not available on central
        // .inner_join(user_account::table)
        .into_boxed();

    if let Some(f) = filter {
        let ContactFormFilter { id } = f;

        apply_equal_filter!(query, id, contact_form::id);
    }
    query
}
