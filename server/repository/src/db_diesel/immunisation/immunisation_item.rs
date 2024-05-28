use super::immunisation_item_row::{
    immunisation_item::{self, dsl as immunisation_item_dsl},
    ImmunisationItemRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    StorageConnection,
};

#[derive(Clone, Default)]
pub struct ImmunisationItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub immunisation_id: Option<EqualFilter<String>>,
}

impl ImmunisationItemFilter {
    pub fn new() -> ImmunisationItemFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn immunisation_id(mut self, filter: EqualFilter<String>) -> Self {
        self.immunisation_id = Some(filter);
        self
    }
}

pub struct ImmunisationItemRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ImmunisationItemRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ImmunisationItemRepository { connection }
    }

    pub fn count(&self, filter: Option<ImmunisationItemFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: ImmunisationItemFilter,
    ) -> Result<Option<ImmunisationItemRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ImmunisationItemFilter,
    ) -> Result<Vec<ImmunisationItemRow>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<ImmunisationItemFilter>,
    ) -> Result<Vec<ImmunisationItemRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<ImmunisationItemRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().collect())
    }
}

type BoxedImmunisationItemQuery = IntoBoxed<'static, immunisation_item::table, DBType>;

fn create_filtered_query(filter: Option<ImmunisationItemFilter>) -> BoxedImmunisationItemQuery {
    let mut query = immunisation_item_dsl::immunisation_item.into_boxed();

    if let Some(f) = filter {
        let ImmunisationItemFilter {
            id,
            immunisation_id,
        } = f;

        apply_equal_filter!(query, id, immunisation_item_dsl::id);
        apply_equal_filter!(
            query,
            immunisation_id,
            immunisation_item_dsl::immunisation_id
        );
    }
    query
}
