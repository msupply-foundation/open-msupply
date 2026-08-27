use repository::{
    clinician_row::{ClinicianRow, ClinicianRowRepository},
    ClinicianRowRepositoryTrait, ClinicianStoreJoinRowRepository, GenderType, RepositoryError,
    StoreRowRepository, TransactionError,
};
mod generate;
mod validate;
use generate::{generate, GenerateInput};
use validate::validate;

use crate::{
    clinician::insert::{generate::GenerateResult, validate::Repositories},
    service_provider::ServiceContext,
};

#[derive(PartialEq, Debug)]
pub enum InsertClinicianError {
    ClinicianAlreadyExists,
    InvalidStore,
    CodeCannotBeEmpty,
    InitialsCannotBeEmpty,
    LastNameCannotBeEmpty,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertClinician {
    pub id: String,
    pub code: String,
    pub initials: String,
    pub last_name: String,
    pub first_name: Option<String>,
    pub gender: Option<GenderType>,
    pub mobile: Option<String>,
}

pub fn insert_clinician(
    ctx: &ServiceContext,
    input: InsertClinician,
) -> Result<ClinicianRow, InsertClinicianError> {
    let input = input.clone();
    let store_id = &ctx.store_id;

    let new_clinician = ctx
        .connection
        .transaction_sync(|connection| {
            let clinician_repo = ClinicianRowRepository::new(connection);
            let store_repo = StoreRowRepository::new(connection);
            let clinician_store_join_repo = ClinicianStoreJoinRowRepository::new(connection);

            validate(
                Repositories {
                    clinician_row: Box::new(clinician_repo),
                    store_row: Box::new(store_repo),
                },
                &input,
                store_id,
            )?;

            let GenerateResult {
                clinician,
                clinician_store_join,
            } = generate(GenerateInput {
                store_id: store_id.to_string(),
                insert_input: input.clone(),
            });

            ClinicianRowRepository::new(connection).upsert_one(&clinician)?;
            clinician_store_join_repo.upsert_one(&clinician_store_join)?;

            Ok(clinician)
        })
        .map_err(|error: TransactionError<InsertClinicianError>| error.to_inner_error())?;
    Ok(new_clinician)
}
impl From<RepositoryError> for InsertClinicianError {
    fn from(error: RepositoryError) -> Self {
        InsertClinicianError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_store_a, MockDataInserts},
        ClinicianFilter, ClinicianRepository, EqualFilter,
    };

    use crate::{
        clinician::insert::InsertClinician,
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };

    #[actix_rt::test]
    async fn insert_clinician_success() {
        let ServiceTestContext {
            connection,
            service_provider,
            ..
        } = setup_all_and_service_provider(
            "insert_clinician_success",
            MockDataInserts::none().stores(),
        )
        .await;

        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = &service_provider.clinician_service;

        let result = service.insert_clinician(
            &context,
            InsertClinician {
                id: "new_id".to_string(),
                code: "new_code".to_string(),
                initials: "TC".to_string(),
                last_name: "Clinician".to_string(),
                ..Default::default()
            },
        );
        let result = result.unwrap();

        assert_eq!(result.id, "new_id");

        let result = ClinicianRepository::new(&connection)
            .query_by_filter(
                &mock_store_a().id,
                ClinicianFilter::new().id(EqualFilter::equal_to("new_id".to_string())),
            )
            .unwrap();
        assert_eq!(result[0].initials, "TC");
    }
}
