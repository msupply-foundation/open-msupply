use repository::{
    clinician_row::{ClinicianRow, ClinicianRowRepository},
    ClinicianRowRepositoryTrait, GenderType, RepositoryError, StoreRowRepository, TransactionError,
};
mod generate;
mod validate;
use generate::{generate, GenerateInput};
use validate::validate;

use crate::{clinician::insert::validate::Repositories, service_provider::ServiceContext};

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
            validate(
                Repositories {
                    clinician_row: Box::new(clinician_repo),
                    store_row: Box::new(store_repo),
                },
                &input,
                &store_id,
            )?;

            let new_clinician = generate(GenerateInput {
                store_id: store_id.to_string(),
                insert_input: input.clone(),
            });

            let clinician_repo = ClinicianRowRepository::new(connection);
            clinician_repo.upsert_one(&new_clinician)?;

            Ok(new_clinician)
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
        ClinicianRowRepository, ClinicianRowRepositoryTrait,
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

        let repo = ClinicianRowRepository::new(&connection);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = &service_provider.clinician_service;

        let result = service.insert_clinician(
            &context,
            InsertClinician {
                id: "new_id".to_owned(),
                code: "new_code".to_owned(),
                initials: "TC".to_string(),
                last_name: "Clinician".to_string(),
                ..Default::default()
            },
        );
        assert!(result.is_ok());
        let result = result.unwrap();

        assert_eq!(result.id, "new_id");

        assert_eq!(repo.find_one_by_id("new_id").unwrap(), Some(result));
    }
}
