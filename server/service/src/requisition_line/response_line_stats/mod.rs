use crate::service_provider::ServiceContext;
use repository::{RepositoryError, RequisitionLine, RequisitionType, StorageConnection};

mod response_line_stats;
pub use self::response_line_stats::{
    customer_store_stats, response_store_stats, RequestStoreStats, ResponseStoreStats,
};
use super::common::check_requisition_line_exists;

#[derive(Debug, PartialEq, Default)]
pub struct ResponseRequisitionStats {
    pub response_store_stats: ResponseStoreStats,
    pub request_store_stats: RequestStoreStats,
}

#[derive(Debug, PartialEq)]
pub enum ResponseRequisitionStatsError {
    RequisitionLineDoesNotExist,
    RequisitionLineDoesNotBelongToCurrentStore,
    NotAResponseRequisition,
    DatabaseError(RepositoryError),
}
type OutError = ResponseRequisitionStatsError;

pub fn get_response_requisition_line_stats(
    ctx: &ServiceContext,
    requisition_line_id: &str,
) -> Result<ResponseRequisitionStats, OutError> {
    let requisition_line = validate(&ctx.connection, &ctx.store_id, requisition_line_id)?;

    let response_store_stats =
        response_store_stats(&ctx.connection, &ctx.store_id, &requisition_line)?;
    let request_store_stats = customer_store_stats(&requisition_line)?;

    Ok(ResponseRequisitionStats {
        response_store_stats,
        request_store_stats,
    })
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    requisition_line_id: &str,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = check_requisition_line_exists(connection, requisition_line_id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?;

    if requisition_line.requisition_row.store_id != store_id {
        return Err(OutError::RequisitionLineDoesNotBelongToCurrentStore);
    }

    if requisition_line.requisition_row.r#type != RequisitionType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    Ok(requisition_line)
}

impl From<RepositoryError> for OutError {
    fn from(error: RepositoryError) -> Self {
        OutError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::service_provider::ServiceProvider;
    use chrono::Utc;
    use repository::{
        mock::{
            mock_draft_request_requisition_line, mock_new_response_requisition_test, mock_store_a,
            mock_store_b, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        ApprovalStatusType, RequisitionLineRow, RequisitionRow, RequisitionStatus,
        StorePreferenceRow, StorePreferenceRowRepository,
    };

    type ServiceError = ResponseRequisitionStatsError;

    #[actix_rt::test]
    async fn get_response_requisition_line_stats_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "get_response_requisition_line_stats_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.get_response_requisition_line_stats(&context, "n/a",),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.get_response_requisition_line_stats(
                &context,
                &mock_draft_request_requisition_line().id
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // RequisitionLineDoesNotBelongToCurrentStore
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.get_response_requisition_line_stats(
                &context,
                &mock_new_response_requisition_test().lines[0].id
            ),
            Err(ServiceError::RequisitionLineDoesNotBelongToCurrentStore)
        );
    }

    fn requisition_one() -> RequisitionRow {
        RequisitionRow {
            id: "requisition_one".to_string(),
            requisition_number: 1,
            store_id: mock_store_a().id,
            name_id: "name_a".to_string(),
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            approval_status: Some(ApprovalStatusType::Approved),
            created_datetime: Utc::now().naive_utc(),
            max_months_of_stock: 3.0,
            ..Default::default()
        }
    }

    fn requisition_line_one_a() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "requisition_line_one_a".to_string(),
            requisition_id: "requisition_one".to_string(),
            item_link_id: "item_d".to_string(),
            requested_quantity: 20.0,
            approved_quantity: 12.0,
            ..Default::default()
        }
    }

    fn requisition_line_one_b() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "requisition_line_one_b".to_string(),
            requisition_id: "requisition_one".to_string(),
            item_link_id: "item_e".to_string(),
            requested_quantity: 15.0,
            available_stock_on_hand: 10.0,
            average_monthly_consumption: 50.0,
            approved_quantity: 12.0,
            ..Default::default()
        }
    }

    fn requisition_two() -> RequisitionRow {
        RequisitionRow {
            id: "requisition_two".to_string(),
            requisition_number: 3,
            store_id: mock_store_a().id,
            name_id: "name_b".to_string(),
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            approval_status: Some(ApprovalStatusType::Approved),
            created_datetime: Utc::now().naive_utc(),
            max_months_of_stock: 6.0,
            ..Default::default()
        }
    }

    fn requisition_line_two_a() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "requisition_line_two_a".to_string(),
            requisition_id: "requisition_two".to_string(),
            item_link_id: "item_e".to_string(),
            requested_quantity: 20.0,
            approved_quantity: 10.0,
            ..Default::default()
        }
    }

    fn requisition_three() -> RequisitionRow {
        RequisitionRow {
            id: "requisition_three".to_string(),
            requisition_number: 4,
            store_id: mock_store_a().id,
            name_id: "name_b".to_string(),
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            approval_status: Some(ApprovalStatusType::Approved),
            created_datetime: Utc::now().naive_utc(),
            max_months_of_stock: 6.0,
            ..Default::default()
        }
    }

    fn requisition_line_three_a() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "requisition_line_three_a".to_string(),
            requisition_id: "requisition_three".to_string(),
            item_link_id: "item_e".to_string(),
            requested_quantity: 25.0,
            approved_quantity: 18.0,
            ..Default::default()
        }
    }

    fn requisition_four() -> RequisitionRow {
        RequisitionRow {
            id: "requisition_four".to_string(),
            requisition_number: 5,
            store_id: mock_store_a().id,
            name_id: "name_b".to_string(),
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            approval_status: Some(ApprovalStatusType::Denied),
            created_datetime: Utc::now().naive_utc(),
            max_months_of_stock: 6.0,
            ..Default::default()
        }
    }

    fn requisition_line_four_a() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "requisition_line_four_a".to_string(),
            requisition_id: "requisition_four".to_string(),
            item_link_id: "item_e".to_string(),
            requested_quantity: 10.0,
            ..Default::default()
        }
    }

    fn requisition_five() -> RequisitionRow {
        RequisitionRow {
            id: "requisition_five".to_string(),
            requisition_number: 5,
            store_id: mock_store_a().id,
            name_id: "name_b".to_string(),
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            created_datetime: Utc::now().naive_utc(),
            max_months_of_stock: 6.0,
            ..Default::default()
        }
    }

    fn requisition_line_five_a() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "requisition_line_five_a".to_string(),
            requisition_id: "requisition_five".to_string(),
            item_link_id: "item_e".to_string(),
            requested_quantity: 6.0,
            ..Default::default()
        }
    }

    fn request_requisition_a() -> RequisitionRow {
        RequisitionRow {
            id: "request_requisition_a".to_string(),
            requisition_number: 4,
            store_id: mock_store_a().id,
            name_id: "name_b".to_string(),
            r#type: RequisitionType::Request,
            status: RequisitionStatus::Sent,
            created_datetime: Utc::now().naive_utc(),
            max_months_of_stock: 5.0,
            ..Default::default()
        }
    }

    fn request_requisition_a_line_a() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "request_requisition_a_line_a".to_string(),
            requisition_id: "request_requisition_a".to_string(),
            item_link_id: "item_e".to_string(),
            requested_quantity: 100.0,
            ..Default::default()
        }
    }

    fn request_requisition_b() -> RequisitionRow {
        RequisitionRow {
            id: "request_requisition_b".to_string(),
            requisition_number: 4,
            store_id: mock_store_a().id,
            name_id: "name_b".to_string(),
            r#type: RequisitionType::Request,
            status: RequisitionStatus::New,
            created_datetime: Utc::now().naive_utc(),
            max_months_of_stock: 5.0,
            ..Default::default()
        }
    }

    fn request_requisition_b_line_a() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "request_requisition_b_line_a".to_string(),
            requisition_id: "request_requisition_b".to_string(),
            item_link_id: "item_e".to_string(),
            requested_quantity: 100.0,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn get_response_requisition_line_stats_success() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "get_response_requisition_line_stats_success",
            MockDataInserts::all(),
            MockData {
                requisitions: vec![
                    requisition_one(),
                    requisition_two(),
                    requisition_three(),
                    requisition_four(),
                    requisition_five(),
                    request_requisition_a(),
                    request_requisition_b(),
                ],
                requisition_lines: vec![
                    requisition_line_one_a(),
                    requisition_line_one_b(),
                    requisition_line_two_a(),
                    requisition_line_three_a(),
                    requisition_line_four_a(),
                    requisition_line_five_a(),
                    request_requisition_a_line_a(),
                    request_requisition_b_line_a(),
                ],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        let stats_result = service
            .get_response_requisition_line_stats(&context, &requisition_line_one_b().id)
            .unwrap();

        // Test when response requisition authorisation is not required
        let response_requisition_stats = ResponseRequisitionStats {
            response_store_stats: ResponseStoreStats {
                stock_on_hand: 0.0,
                stock_on_order: request_requisition_a_line_a().requested_quantity,
                incoming_stock: 0,
                requested_quantity: requisition_line_one_b().requested_quantity,
                other_requested_quantity: requisition_line_two_a().requested_quantity
                    + requisition_line_three_a().requested_quantity
                    + requisition_line_four_a().requested_quantity
                    + requisition_line_five_a().requested_quantity,
            },
            request_store_stats: RequestStoreStats {
                stock_on_hand: requisition_line_one_b().available_stock_on_hand,
                amc: requisition_line_one_b().average_monthly_consumption,
                max_months_of_stock: requisition_one().max_months_of_stock,
                suggested_quantity: requisition_line_one_b().suggested_quantity,
            },
        };

        assert_eq!(stats_result, response_requisition_stats);

        // Test Authorisation required on response requisition
        StorePreferenceRowRepository::new(&context.connection)
            .upsert_one(&StorePreferenceRow {
                id: mock_store_a().id,
                response_requisition_requires_authorisation: true,
                ..Default::default()
            })
            .unwrap();

        let stats_result = service
            .get_response_requisition_line_stats(&context, &requisition_line_one_b().id)
            .unwrap();

        let requisition_stats = ResponseRequisitionStats {
            response_store_stats: ResponseStoreStats {
                stock_on_hand: 0.0,
                stock_on_order: request_requisition_a_line_a().requested_quantity,
                incoming_stock: 0,
                requested_quantity: requisition_line_one_b().approved_quantity,
                other_requested_quantity: requisition_line_two_a().approved_quantity
                    + requisition_line_three_a().approved_quantity
                    + requisition_line_five_a().requested_quantity,
            },
            request_store_stats: RequestStoreStats {
                stock_on_hand: requisition_line_one_b().available_stock_on_hand,
                amc: requisition_line_one_b().average_monthly_consumption,
                max_months_of_stock: requisition_one().max_months_of_stock,
                suggested_quantity: requisition_line_one_b().suggested_quantity,
            },
        };

        assert_eq!(stats_result, requisition_stats);
    }
}
