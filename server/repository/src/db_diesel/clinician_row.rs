use super::StorageConnection;

use crate::{
    clinician_link, ChangelogSyncType, ClinicianLinkRow, ClinicianLinkRowRepository, GenderType,
    RepositoryError, SourceSiteId, Upsert,
};
use crate::{ChangelogRepository, RowActionType};

use diesel::prelude::*;

table! {
  clinician (id) {
    id -> Text,
    code  -> Text,
    last_name -> Text,
    initials -> Text,
    first_name -> Nullable<Text>,
    address1 -> Nullable<Text>,
    address2 -> Nullable<Text>,
    phone -> Nullable<Text>,
    mobile -> Nullable<Text>,
    email -> Nullable<Text>,
    gender -> Nullable<crate::db_diesel::name_row::GenderTypeMapping>,
    is_active -> Bool,
    store_id -> Nullable<Text>,
  }

}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = clinician)]
pub struct ClinicianRow {
    pub id: String,
    pub code: String,
    pub last_name: String,
    pub initials: String,
    pub first_name: Option<String>,
    pub address1: Option<String>,
    pub address2: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub email: Option<String>,
    pub gender: Option<GenderType>,
    pub is_active: bool,
    pub store_id: Option<String>,
}

allow_tables_to_appear_in_same_query!(clinician, clinician_link);
fn insert_or_ignore_clinician_link(
    connection: &StorageConnection,
    row: &ClinicianRow,
) -> Result<(), RepositoryError> {
    let clinician_link_row = ClinicianLinkRow {
        id: row.id.clone(),
        clinician_id: row.id.clone(),
    };

    ClinicianLinkRowRepository::new(connection).insert_one_or_ignore(&clinician_link_row)
}

pub struct ClinicianRowRepository<'a> {
    connection: &'a StorageConnection,
}

pub trait ClinicianRowRepositoryTrait<'a> {
    fn find_one_by_id(&self, row_id: &str) -> Result<Option<ClinicianRow>, RepositoryError>;
    fn upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError>;
    fn delete(&self, row_id: &str) -> Result<(), RepositoryError>;
}

impl<'a> ClinicianRowRepositoryTrait<'a> for ClinicianRowRepository<'a> {
    fn find_one_by_id(&self, row_id: &str) -> Result<Option<ClinicianRow>, RepositoryError> {
        let result = clinician::dsl::clinician
            .filter(clinician::dsl::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician::dsl::clinician)
            .values(row)
            .on_conflict(clinician::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        insert_or_ignore_clinician_link(self.connection, row)?;
        let changelog = ClinicianRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(clinician::dsl::clinician.filter(clinician::dsl::id.eq(row_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl<'a> ClinicianRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ClinicianRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician::dsl::clinician)
            .values(row)
            .on_conflict(clinician::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        insert_or_ignore_clinician_link(self.connection, row)?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ClinicianRow>, RepositoryError> {
        Ok(clinician::table
            .filter(clinician::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

pub struct ClinicianRowDelete(pub String);

impl Upsert for ClinicianRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ClinicianRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ClinicianRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
#[derive(Default)]
pub struct MockClinicianRowRepository {
    pub find_one_by_id_result: Option<ClinicianRow>,
}

impl MockClinicianRowRepository {
    pub fn boxed() -> Box<dyn ClinicianRowRepositoryTrait<'static>> {
        Box::new(MockClinicianRowRepository::default())
    }
}

impl<'a> ClinicianRowRepositoryTrait<'a> for MockClinicianRowRepository {
    fn find_one_by_id(&self, _row_id: &str) -> Result<Option<ClinicianRow>, RepositoryError> {
        Ok(self.find_one_by_id_result.clone())
    }

    fn upsert_one(&self, _row: &ClinicianRow) -> Result<(), RepositoryError> {
        Ok(())
    }

    fn delete(&self, _row_id: &str) -> Result<(), RepositoryError> {
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use util::assert_matches;

    use crate::{
        mock::MockDataInserts, test_db::setup_all, ClinicianRow, ClinicianRowRepository,
        ClinicianRowRepositoryTrait, RepositoryError,
    };

    #[actix_rt::test]
    async fn store_id_reference_constraint() {
        let (_, connection, _, _) = setup_all(
            "store_id_reference_constraint",
            MockDataInserts::none().stores(),
        )
        .await;

        let repo = ClinicianRowRepository::new(&connection);

        let clinician = ClinicianRow {
            id: "no store".to_string(),
            store_id: None,
            ..Default::default()
        };
        let result = repo.upsert_one(&clinician);
        assert!(result.is_ok());

        let clinician = ClinicianRow {
            id: "invalid store".to_string(),
            store_id: Some("invalid_store".to_string()),
            ..Default::default()
        };
        let result = repo.upsert_one(&clinician);
        assert_matches!(result, Err(RepositoryError::ForeignKeyViolation(_)));

        let clinician = ClinicianRow {
            id: "valid store".to_string(),
            store_id: Some("store_a".to_string()),
            ..Default::default()
        };
        let result = repo.upsert_one(&clinician);
        assert!(result.is_ok());
    }
}
