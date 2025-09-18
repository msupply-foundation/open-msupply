use super::{
    shipping_method_row::{shipping_method, ShippingMethodRow},
    StorageConnection,
};
use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, StringFilter,
};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type ShippingMethod = ShippingMethodRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct ShippingMethodFilter {
    pub id: Option<EqualFilter<String>>,
    pub method: Option<StringFilter>,
}

pub struct ShippingMethodRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ShippingMethodRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ShippingMethodRepository { connection }
    }

    pub fn count(&self, filter: Option<ShippingMethodFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ShippingMethodFilter,
    ) -> Result<Vec<ShippingMethod>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<ShippingMethodFilter>,
    ) -> Result<Vec<ShippingMethod>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<ShippingMethod>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedShippingMethodQuery = IntoBoxed<'static, shipping_method::table, DBType>;

pub fn create_filtered_query(filter: Option<ShippingMethodFilter>) -> BoxedShippingMethodQuery {
    let mut query = shipping_method::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, shipping_method::id);
        apply_string_filter!(query, filter.method, shipping_method::method);
    }

    query
}
