use super::{
    name_row::name, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    RowActionType, StorageConnection,
};

use crate::{
    diesel_macros::{apply_sort, define_linked_tables},
    repository_error::RepositoryError, Sort, Upsert
};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

pub enum NameInsuranceJoinSortField {
    ExpiryDate,
    IsActive,
}

pub type NameInsuranceJoinSort = Sort<NameInsuranceJoinSortField>;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InsurancePolicyType {
    #[default]
    Personal,
    Business,
}

define_linked_tables! {
    view: name_insurance_join = "name_insurance_join_view",
    core: name_insurance_join_with_links = "name_insurance_join",
    struct: NameInsuranceJoinRow,
    repo: NameInsuranceJoinRowRepository,
    shared: {
        insurance_provider_id -> Text,
        policy_number_person -> Nullable<Text>,
        policy_number_family -> Nullable<Text>,
        policy_number -> Text,
        policy_type -> crate::db_diesel::name_insurance_join_row::InsurancePolicyTypeMapping,
        discount_percentage -> Double,
        expiry_date -> Date,
        is_active -> Bool,
        entered_by_id -> Nullable<Text>,
        name_of_insured -> Nullable<Text>,
    },
    links: {
        name_link_id -> name_id,
    }
}

joinable!(name_insurance_join -> name (name_id));
allow_tables_to_appear_in_same_query!(name_insurance_join, name);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default, Serialize, Deserialize,
)]
#[diesel(table_name = name_insurance_join)]
pub struct NameInsuranceJoinRow {
    pub id: String,
    pub insurance_provider_id: String,
    pub policy_number_person: Option<String>,
    pub policy_number_family: Option<String>,
    pub policy_number: String,
    pub policy_type: InsurancePolicyType,
    pub discount_percentage: f64,
    pub expiry_date: chrono::NaiveDate,
    pub is_active: bool,
    pub entered_by_id: Option<String>,
    pub name_of_insured: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub name_id: String,
}

pub struct NameInsuranceJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameInsuranceJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameInsuranceJoinRowRepository { connection }
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<NameInsuranceJoinRow>, RepositoryError> {
        let result = name_insurance_join::table
            .filter(name_insurance_join::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
        let result = name_insurance_join::table
            .filter(name_insurance_join::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_name_id(
        &self,
        name_id: &str,
        sort: Option<NameInsuranceJoinSort>,
    ) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
        let mut query = name_insurance_join::table
            .filter(name_insurance_join::name_id.eq(name_id))
            .into_boxed();

        if let Some(sort) = sort {
            match sort.key {
                NameInsuranceJoinSortField::ExpiryDate => {
                    apply_sort!(query, sort, name_insurance_join::expiry_date);
                }
                NameInsuranceJoinSortField::IsActive => {
                    apply_sort!(query, sort, name_insurance_join::is_active);
                }
            }
        } else {
            query = query.order(name_insurance_join::id.asc())
        }

        let result = query.load::<NameInsuranceJoinRow>(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn upsert_one(&self, row: &NameInsuranceJoinRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
        self.insert_changelog(&row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::NameInsuranceJoin,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }
}

impl Upsert for NameInsuranceJoinRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = NameInsuranceJoinRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameInsuranceJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
