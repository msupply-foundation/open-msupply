use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};

use repository::{
    ActivityLogType, RepositoryError, StorageConnection, TransactionError, VaccinationRow,
    VaccinationRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum InsertVaccinationError {
    VaccinationNameExistsForThisProgram,
    VaccinationAlreadyExists,
    CreatedRecordNotFound,
    ProgramDoesNotExist,
    DoseMinAgesAreNotInOrder,
    DemographicIndicatorDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertVaccination {
    pub id: String,
    pub name: String,
    pub program_id: String,
    pub demographic_indicator_id: Option<String>,
    pub coverage_rate: f64,
    pub is_active: bool,
    pub wastage_rate: f64,
}

pub fn insert_vaccination(
    ctx: &ServiceContext,
    input: InsertVaccination,
) -> Result<VaccinationRow, InsertVaccinationError> {
    let vaccination = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_vaccination = generate(input.clone());
            VaccinationRowRepository::new(connection).upsert_one(&new_vaccination)?;

            activity_log_entry(
                ctx,
                ActivityLogType::VaccinationCreated,
                Some(new_vaccination.id.clone()),
                None,
                None,
            )?;

            Ok(new_vaccination)

            // get_vaccination(&ctx.connection, new_vaccination.id)
            //     .map_err(InsertVaccinationError::from)
        })
        .map_err(|error: TransactionError<InsertVaccinationError>| error.to_inner_error())?; // todo
    Ok(vaccination)
}

impl From<RepositoryError> for InsertVaccinationError {
    fn from(error: RepositoryError) -> Self {
        InsertVaccinationError::DatabaseError(error)
    }
}

// impl From<SingleRecordError> for InsertVaccinationError {
//     fn from(error: SingleRecordError) -> Self {
//         use InsertVaccinationError::*;
//         match error {
//             SingleRecordError::DatabaseError(error) => DatabaseError(error),
//             SingleRecordError::NotFound(_) => CreatedRecordNotFound,
//         }
//     }
// }

#[cfg(test)]
mod insert {
    use repository::mock::{mock_store_a, MockData, MockDataInserts};
    use repository::test_db::{setup_all, setup_all_with_data};

    use crate::service_provider::ServiceProvider;
    use crate::vaccination::insert::{InsertVaccination, InsertVaccinationError};

    #[actix_rt::test]
    async fn insert_vaccination_errors() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_vaccination_errors",
            MockDataInserts::none().stores().name_store_joins().items(),
            MockData {
                // vaccinations: vec![VaccinationRow {
                //     ..mock_vaccination_a()
                // }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.vaccination_service;

        let store_id = &mock_store_a().id;
        // VaccinationAlreadyExists
        assert_eq!(
            service.insert_vaccination(
                &context,
                InsertVaccination {
                    id: "todo".to_string(),
                    // id: mock_vaccination_a).id,
                    ..Default::default()
                }
            ),
            Err(InsertVaccinationError::VaccinationAlreadyExists)
        );
    }

    #[actix_rt::test]
    async fn insert_vaccination_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_vaccination_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // Can create
        // let _result = service_provider
        //     .vaccination_service
        //     .insert_vaccination(
        //         &context,
        //         &mock_store_a().id,
        //         InsertVaccination {
        //             id: "new_rnr_id".to_string(),
        //             supplier_id: mock_name_store_c().id,
        //             program_id: mock_program_b().id,
        //             period_id: mock_period_2_c().id,
        //         },
        //     )
        //     .unwrap();
    }
}
