use super::{
    property_row::{property, property::dsl as property_dsl},
    PropertyRow, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    StringFilter,
};

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type Property = PropertyRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct PropertyFilter {
    pub id: Option<EqualFilter<String>>,
    pub key: Option<StringFilter>,
}

pub struct PropertyRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyRepository { connection }
    }

    pub fn count(&self, filter: Option<PropertyFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PropertyFilter,
    ) -> Result<Vec<Property>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(&self, filter: Option<PropertyFilter>) -> Result<Vec<Property>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        let result = query.load::<Property>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn create_filtered_query(filter: Option<PropertyFilter>) -> BoxedPropertyQuery {
        let mut query = property_dsl::property.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, property_dsl::id);
            apply_string_filter!(query, filter.key, property_dsl::key);
        }

        query
    }
}

type BoxedPropertyQuery = IntoBoxed<'static, property::table, DBType>;

impl PropertyFilter {
    pub fn new() -> PropertyFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn key(mut self, filter: StringFilter) -> Self {
        self.key = Some(filter);
        self
    }
}
