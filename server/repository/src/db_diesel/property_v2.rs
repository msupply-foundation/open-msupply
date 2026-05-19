use diesel::{dsl::IntoBoxed, prelude::*};

use super::{property_v2_row::property_v2, PropertyV2Row, StorageConnection};
use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, StringFilter,
};

pub type PropertyV2 = PropertyV2Row;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct PropertyV2Filter {
    pub id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    // When true, soft-deleted properties are included. Defaults to false.
    pub include_deleted: bool,
}

pub struct PropertyV2Repository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyV2Repository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyV2Repository { connection }
    }

    pub fn count(&self, filter: Option<PropertyV2Filter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PropertyV2Filter,
    ) -> Result<Vec<PropertyV2>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<PropertyV2Filter>,
    ) -> Result<Vec<PropertyV2>, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        let result = query.load::<PropertyV2>(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn create_filtered_query(filter: Option<PropertyV2Filter>) -> BoxedPropertyV2Query {
        let mut query = property_v2::table.into_boxed();

        let include_deleted = filter.as_ref().map(|f| f.include_deleted).unwrap_or(false);
        if !include_deleted {
            query = query.filter(property_v2::deleted_datetime.is_null());
        }

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, property_v2::id);
            apply_equal_filter!(query, filter.r#type, property_v2::type_);
            apply_string_filter!(query, filter.name, property_v2::name);
        }

        query
    }
}

type BoxedPropertyV2Query = IntoBoxed<'static, property_v2::table, DBType>;

impl PropertyV2Filter {
    pub fn new() -> PropertyV2Filter {
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
