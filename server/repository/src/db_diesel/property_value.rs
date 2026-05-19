use diesel::{dsl::IntoBoxed, prelude::*};

use super::{name_row::name, property_value_row::property_value, DBType, StorageConnection};
use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
    DateFilter, EqualFilter, PropertyValueRow, StringFilter,
};

allow_tables_to_appear_in_same_query!(property_value, name);

pub type PropertyValue = PropertyValueRow;

/// Filter over `property_value` rows. Used standalone (via [`PropertyValueRepository`])
/// or composed into a parent filter (e.g. `NameFilter::property`) as a sub-query that
/// projects `record_id` for an `eq_any` against the parent table's id column.
#[derive(Clone, Default, PartialEq, Debug)]
pub struct PropertyValueFilter {
    pub id: Option<EqualFilter<String>>,
    pub table_name: Option<EqualFilter<String>>,
    pub record_id: Option<EqualFilter<String>>,
    pub property_id: Option<EqualFilter<String>>,
    pub value_text: Option<StringFilter>,
    pub value_option_id: Option<EqualFilter<String>>,
    pub value_number: Option<EqualFilter<i32>>,
    pub value_real: Option<EqualFilter<f64>>,
    pub value_date: Option<DateFilter>,
}

pub struct PropertyValueRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyValueRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyValueRepository { connection }
    }

    pub fn count(&self, filter: Option<PropertyValueFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PropertyValueFilter,
    ) -> Result<Vec<PropertyValue>, RepositoryError> {
        let query = Self::create_filtered_query(Some(filter));
        Ok(query.load::<PropertyValue>(self.connection.lock().connection())?)
    }

    pub fn create_filtered_query(filter: Option<PropertyValueFilter>) -> BoxedPropertyValueQuery {
        let mut query = property_value::table.into_boxed();

        if let Some(f) = filter {
            let PropertyValueFilter {
                id,
                table_name,
                record_id,
                property_id,
                value_text,
                value_option_id,
                value_number,
                value_real,
                value_date,
            } = f;

            apply_equal_filter!(query, id, property_value::id);
            apply_equal_filter!(query, table_name, property_value::table_name);
            apply_equal_filter!(query, record_id, property_value::record_id);
            apply_equal_filter!(query, property_id, property_value::property_id);
            apply_string_filter!(query, value_text, property_value::value_text);
            apply_equal_filter!(query, value_option_id, property_value::value_option_id);
            apply_equal_filter!(query, value_number, property_value::value_number);
            apply_equal_filter!(query, value_real, property_value::value_real);
            apply_date_filter!(query, value_date, property_value::value_date);
        }

        query
    }
}

type BoxedPropertyValueQuery = IntoBoxed<'static, property_value::table, DBType>;

impl PropertyValueFilter {
    pub fn new() -> PropertyValueFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn table_name(mut self, filter: EqualFilter<String>) -> Self {
        self.table_name = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }

    pub fn property_id(mut self, filter: EqualFilter<String>) -> Self {
        self.property_id = Some(filter);
        self
    }

    pub fn value_text(mut self, filter: StringFilter) -> Self {
        self.value_text = Some(filter);
        self
    }

    pub fn value_option_id(mut self, filter: EqualFilter<String>) -> Self {
        self.value_option_id = Some(filter);
        self
    }

    pub fn value_number(mut self, filter: EqualFilter<i32>) -> Self {
        self.value_number = Some(filter);
        self
    }

    pub fn value_real(mut self, filter: EqualFilter<f64>) -> Self {
        self.value_real = Some(filter);
        self
    }

    pub fn value_date(mut self, filter: DateFilter) -> Self {
        self.value_date = Some(filter);
        self
    }
}
