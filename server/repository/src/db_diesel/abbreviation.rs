use super::{abbreviation_row::abbreviation, AbbreviationRow, StorageConnection};

use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    StringFilter,
};

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type Abbreviation = AbbreviationRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct AbbreviationFilter {
    pub id: Option<EqualFilter<String>>,
    pub text: Option<StringFilter>,
}

pub struct AbbreviationRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AbbreviationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AbbreviationRepository { connection }
    }

    pub fn count(&self, filter: Option<AbbreviationFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: AbbreviationFilter,
    ) -> Result<Vec<Abbreviation>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<AbbreviationFilter>,
    ) -> Result<Vec<Abbreviation>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        let result = query.load::<Abbreviation>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn create_filtered_query(filter: Option<AbbreviationFilter>) -> BoxedAbbreviationQuery {
        let mut query = abbreviation::table.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, abbreviation::id);
            apply_string_filter!(query, filter.text, abbreviation::text);
        }

        query
    }
}

type BoxedAbbreviationQuery = IntoBoxed<'static, abbreviation::table, DBType>;

impl AbbreviationFilter {
    pub fn new() -> AbbreviationFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn key(mut self, filter: StringFilter) -> Self {
        self.text = Some(filter);
        self
    }
}
