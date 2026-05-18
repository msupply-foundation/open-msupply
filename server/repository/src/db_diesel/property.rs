use diesel::{dsl::IntoBoxed, prelude::*};

use super::{property_row::property, PropertyRow, StorageConnection};
use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, StringFilter,
};

pub type Property = PropertyRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct PropertyFilter {
    pub id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    // When true, soft-deleted properties are included. Defaults to false.
    pub include_deleted: bool,
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
        let mut query = property::table.into_boxed();

        let include_deleted = filter.as_ref().map(|f| f.include_deleted).unwrap_or(false);
        if !include_deleted {
            query = query.filter(property::deleted_datetime.is_null());
        }

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, property::id);
            apply_equal_filter!(query, filter.r#type, property::type_);
            apply_string_filter!(query, filter.name, property::name);
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

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn include_deleted(mut self) -> Self {
        self.include_deleted = true;
        self
    }
}
