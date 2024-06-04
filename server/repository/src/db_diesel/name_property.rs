use super::{
    name_property_row::{name_property, name_property::dsl as name_property_dsl},
    property_row::{property, property::dsl as property_dsl},
    NamePropertyRow, StorageConnection,
};

use crate::{diesel_macros::apply_equal_filter, PropertyRow};

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

#[derive(PartialEq, Debug, Clone)]
pub struct NameProperty {
    pub name_property_row: NamePropertyRow,
    pub property_row: PropertyRow,
}

#[derive(Clone, Default, PartialEq, Debug)]
pub struct NamePropertyFilter {
    pub id: Option<EqualFilter<String>>,
}

type NamePropertyJoin = (NamePropertyRow, PropertyRow);

pub struct NamePropertyRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NamePropertyRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NamePropertyRepository { connection }
    }

    pub fn count(&self, filter: Option<NamePropertyFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: NamePropertyFilter,
    ) -> Result<Vec<NameProperty>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<NamePropertyFilter>,
    ) -> Result<Vec<NameProperty>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        let result = query.load::<NamePropertyJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(filter: Option<NamePropertyFilter>) -> BoxedNamePropertyQuery {
        let mut query = name_property_dsl::name_property
            .inner_join(property_dsl::property)
            .into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, name_property_dsl::id);
        }

        query
    }
}

type BoxedNamePropertyQuery =
    IntoBoxed<'static, InnerJoin<name_property::table, property::table>, DBType>;

fn to_domain((name_property_row, property_row): NamePropertyJoin) -> NameProperty {
    NameProperty {
        name_property_row,
        property_row,
    }
}

impl NamePropertyFilter {
    pub fn new() -> NamePropertyFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
}
