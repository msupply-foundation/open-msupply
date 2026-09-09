use repository::{
    ItemRow, ItemRowRepository, ItemType, PrescriptionRequestLineRow,
    PrescriptionRequestLineRowRepository, RepositoryError, StorageConnection, TransactionError,
};

use crate::prescription_request::validate::{
    check_prescription_request_editable, CommonPrescriptionRequestError,
};
use crate::service_provider::ServiceContext;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct UpsertPrescriptionRequestLine {
    pub id: String,
    pub prescription_request_id: String,
    pub item_id: String,
    /// Prescribed quantity, in units
    pub number_of_units: f64,
    /// Directions (abbreviations already expanded client-side)
    pub note: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpsertPrescriptionRequestLineError {
    PrescriptionRequestDoesNotExist,
    NotThisStorePrescriptionRequest,
    /// Lines are only editable while the request is New.
    NotEditable,
    /// The line exists on a different prescription request.
    LineBelongsToAnotherPrescriptionRequest,
    ItemDoesNotExist,
    NotAStockItem,
    InvalidQuantity,
    DatabaseError(RepositoryError),
}

pub fn upsert_prescription_request_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpsertPrescriptionRequestLine,
) -> Result<PrescriptionRequestLineRow, UpsertPrescriptionRequestLineError> {
    use UpsertPrescriptionRequestLineError::*;

    ctx.connection
        .transaction_sync(|connection| {
            check_prescription_request_editable(
                connection,
                store_id,
                &input.prescription_request_id,
            )
            .map_err(|error| match error {
                CommonPrescriptionRequestError::DoesNotExist => PrescriptionRequestDoesNotExist,
                CommonPrescriptionRequestError::NotThisStorePrescriptionRequest => {
                    NotThisStorePrescriptionRequest
                }
                CommonPrescriptionRequestError::NotEditable => NotEditable,
                CommonPrescriptionRequestError::DatabaseError(e) => DatabaseError(e),
            })?;

            let repo = PrescriptionRequestLineRowRepository::new(connection);
            if let Some(existing_line) = repo.find_one_by_id(&input.id)? {
                if existing_line.prescription_request_id != input.prescription_request_id {
                    return Err(LineBelongsToAnotherPrescriptionRequest);
                }
            }

            check_item(connection, &input.item_id)?;
            if input.number_of_units <= 0.0 {
                return Err(InvalidQuantity);
            }

            let row = PrescriptionRequestLineRow {
                id: input.id,
                prescription_request_id: input.prescription_request_id,
                item_id: input.item_id,
                number_of_units: input.number_of_units,
                note: input.note,
            };
            repo.upsert_one(&row)?;

            Ok(row)
        })
        .map_err(
            |error: TransactionError<UpsertPrescriptionRequestLineError>| error.to_inner_error(),
        )
}

fn check_item(
    connection: &StorageConnection,
    item_id: &str,
) -> Result<ItemRow, UpsertPrescriptionRequestLineError> {
    use UpsertPrescriptionRequestLineError::*;

    let item = ItemRowRepository::new(connection)
        .find_one_by_id(item_id)?
        .ok_or(ItemDoesNotExist)?;
    if item.r#type != ItemType::Stock {
        return Err(NotAStockItem);
    }
    Ok(item)
}

impl From<RepositoryError> for UpsertPrescriptionRequestLineError {
    fn from(error: RepositoryError) -> Self {
        UpsertPrescriptionRequestLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_item_a, mock_item_b, mock_item_service_item, mock_patient, MockDataInserts},
        test_db::setup_all,
        PrescriptionRequestRow,
    };
    use util::uuid::uuid;

    use crate::prescription_request::insert::InsertPrescriptionRequest;
    use crate::prescription_request::update::{
        UpdatePrescriptionRequest, UpdatePrescriptionRequestStatus,
    };
    use crate::service_provider::{ServiceContext, ServiceProvider};

    use super::*;

    async fn setup(test: &str) -> (ServiceProvider, ServiceContext) {
        let (_, _, connection_manager, _) = setup_all(test, MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        (service_provider, context)
    }

    fn new_request(
        service_provider: &ServiceProvider,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> PrescriptionRequestRow {
        service_provider
            .prescription_request_service
            .insert_prescription_request(
                ctx,
                store_id,
                InsertPrescriptionRequest {
                    id: uuid(),
                    patient_id: mock_patient().id,
                    ..Default::default()
                },
            )
            .unwrap()
            .prescription_request_row
    }

    fn line_input(request_id: &str) -> UpsertPrescriptionRequestLine {
        UpsertPrescriptionRequestLine {
            id: uuid(),
            prescription_request_id: request_id.to_string(),
            item_id: mock_item_a().id,
            number_of_units: 12.0,
            note: Some("Twice a day".to_string()),
        }
    }

    #[actix_rt::test]
    async fn upsert_prescription_request_line_errors() {
        let (service_provider, ctx) = setup("upsert_prescription_request_line_errors").await;
        let service = &service_provider.prescription_request_line_service;
        let request = new_request(&service_provider, &ctx, "store_a");

        // PrescriptionRequestDoesNotExist
        assert_eq!(
            service.upsert_prescription_request_line(&ctx, "store_a", line_input("does not exist")),
            Err(UpsertPrescriptionRequestLineError::PrescriptionRequestDoesNotExist)
        );

        // NotThisStorePrescriptionRequest
        assert_eq!(
            service.upsert_prescription_request_line(&ctx, "store_b", line_input(&request.id)),
            Err(UpsertPrescriptionRequestLineError::NotThisStorePrescriptionRequest)
        );

        // ItemDoesNotExist
        assert_eq!(
            service.upsert_prescription_request_line(
                &ctx,
                "store_a",
                UpsertPrescriptionRequestLine {
                    item_id: "does not exist".to_string(),
                    ..line_input(&request.id)
                }
            ),
            Err(UpsertPrescriptionRequestLineError::ItemDoesNotExist)
        );

        // NotAStockItem
        assert_eq!(
            service.upsert_prescription_request_line(
                &ctx,
                "store_a",
                UpsertPrescriptionRequestLine {
                    item_id: mock_item_service_item().id,
                    ..line_input(&request.id)
                }
            ),
            Err(UpsertPrescriptionRequestLineError::NotAStockItem)
        );

        // InvalidQuantity — zero is as meaningless as negative on a prescription
        for number_of_units in [0.0, -1.0] {
            assert_eq!(
                service.upsert_prescription_request_line(
                    &ctx,
                    "store_a",
                    UpsertPrescriptionRequestLine {
                        number_of_units,
                        ..line_input(&request.id)
                    }
                ),
                Err(UpsertPrescriptionRequestLineError::InvalidQuantity)
            );
        }

        // LineBelongsToAnotherPrescriptionRequest
        let other_request = new_request(&service_provider, &ctx, "store_a");
        let existing = service
            .upsert_prescription_request_line(&ctx, "store_a", line_input(&request.id))
            .unwrap();
        assert_eq!(
            service.upsert_prescription_request_line(
                &ctx,
                "store_a",
                UpsertPrescriptionRequestLine {
                    id: existing.id.clone(),
                    ..line_input(&other_request.id)
                }
            ),
            Err(UpsertPrescriptionRequestLineError::LineBelongsToAnotherPrescriptionRequest)
        );

        // NotEditable — the request has been handed over
        service_provider
            .prescription_request_service
            .update_prescription_request(
                &ctx,
                "store_a",
                UpdatePrescriptionRequest {
                    id: request.id.clone(),
                    status: Some(UpdatePrescriptionRequestStatus::ReadyToDispense),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(
            service.upsert_prescription_request_line(&ctx, "store_a", line_input(&request.id)),
            Err(UpsertPrescriptionRequestLineError::NotEditable)
        );
    }

    #[actix_rt::test]
    async fn upsert_prescription_request_line_success() {
        let (service_provider, ctx) = setup("upsert_prescription_request_line_success").await;
        let service = &service_provider.prescription_request_line_service;
        let request = new_request(&service_provider, &ctx, "store_a");

        let input = line_input(&request.id);
        let inserted = service
            .upsert_prescription_request_line(&ctx, "store_a", input.clone())
            .unwrap();
        assert_eq!(
            inserted,
            PrescriptionRequestLineRow {
                id: input.id.clone(),
                prescription_request_id: request.id.clone(),
                item_id: mock_item_a().id,
                number_of_units: 12.0,
                note: Some("Twice a day".to_string()),
            }
        );
        assert_eq!(
            PrescriptionRequestLineRowRepository::new(&ctx.connection)
                .find_one_by_id(&input.id)
                .unwrap(),
            Some(inserted)
        );

        // The same id again is an edit, not a second line
        let updated = service
            .upsert_prescription_request_line(
                &ctx,
                "store_a",
                UpsertPrescriptionRequestLine {
                    item_id: mock_item_b().id,
                    number_of_units: 3.0,
                    note: None,
                    ..input.clone()
                },
            )
            .unwrap();
        assert_eq!(updated.item_id, mock_item_b().id);
        assert_eq!(updated.number_of_units, 3.0);
        assert_eq!(updated.note, None);
        assert_eq!(
            PrescriptionRequestLineRowRepository::new(&ctx.connection)
                .find_many_by_prescription_request_id(&request.id)
                .unwrap()
                .len(),
            1
        );
    }
}
