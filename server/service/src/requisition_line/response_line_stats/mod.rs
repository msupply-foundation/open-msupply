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
        RequisitionLineRow, RequisitionRow, RequisitionStatus,
    };
    use util::inline_init;

    type ServiceError = ResponseRequisitionStatsError;

    #[actix_rt::test]
    async fn get_response_requisition_line_stats_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "get_response_requisition_line_stats_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
        inline_init(|r: &mut RequisitionRow| {
            r.id = "requisition_one".to_string();
            r.requisition_number = 1;
            r.store_id = mock_store_a().id;
            r.name_link_id = "name_a".to_string();
            r.r#type = RequisitionType::Response;
            r.status = RequisitionStatus::New;
            r.created_datetime = Utc::now().naive_utc();
            r.max_months_of_stock = 3.0;
        })
    }

    fn requisition_line_one_a() -> RequisitionLineRow {
        inline_init(|r: &mut RequisitionLineRow| {
            r.id = "requisition_line_one_a".to_string();
            r.requisition_id = "requisition_one".to_string();
            r.item_link_id = "item_d".to_string();
            r.requested_quantity = 20.0;
        })
    }

    fn requisition_line_one_b() -> RequisitionLineRow {
        inline_init(|r: &mut RequisitionLineRow| {
            r.id = "requisition_line_one_b".to_string();
            r.requisition_id = "requisition_one".to_string();
            r.item_link_id = "item_e".to_string();
            r.requested_quantity = 15.0;
            r.available_stock_on_hand = 10.0;
            r.average_monthly_consumption = 50.0;
            r.suggested_quantity = 240.0;
        })
    }

    fn requisition_two() -> RequisitionRow {
        inline_init(|r: &mut RequisitionRow| {
            r.id = "requisition_two".to_string();
            r.requisition_number = 3;
            r.store_id = mock_store_a().id;
            r.name_link_id = "name_b".to_string();
            r.r#type = RequisitionType::Response;
            r.status = RequisitionStatus::New;
            r.created_datetime = Utc::now().naive_utc();
            r.max_months_of_stock = 6.0;
        })
    }

    fn requisition_line_two_a() -> RequisitionLineRow {
        inline_init(|r: &mut RequisitionLineRow| {
            r.id = "requisition_line_two_a".to_string();
            r.requisition_id = "requisition_two".to_string();
            r.item_link_id = "item_e".to_string();
            r.requested_quantity = 20.0;
        })
    }

    fn request_requisition_a() -> RequisitionRow {
        inline_init(|r: &mut RequisitionRow| {
            r.id = "request_requisition_a".to_string();
            r.requisition_number = 4;
            r.store_id = mock_store_a().id;
            r.name_link_id = "name_b".to_string();
            r.r#type = RequisitionType::Request;
            r.status = RequisitionStatus::Sent;
            r.created_datetime = Utc::now().naive_utc();
            r.max_months_of_stock = 5.0;
        })
    }

    fn request_requisition_a_line_a() -> RequisitionLineRow {
        inline_init(|r: &mut RequisitionLineRow| {
            r.id = "request_requisition_a_line_a".to_string();
            r.requisition_id = "request_requisition_a".to_string();
            r.item_link_id = "item_e".to_string();
            r.requested_quantity = 100.0;
        })
    }

    fn request_requisition_b() -> RequisitionRow {
        inline_init(|r: &mut RequisitionRow| {
            r.id = "request_requisition_b".to_string();
            r.requisition_number = 4;
            r.store_id = mock_store_a().id;
            r.name_link_id = "name_b".to_string();
            r.r#type = RequisitionType::Request;
            r.status = RequisitionStatus::New;
            r.created_datetime = Utc::now().naive_utc();
            r.max_months_of_stock = 5.0;
        })
    }

    fn request_requisition_b_line_a() -> RequisitionLineRow {
        inline_init(|r: &mut RequisitionLineRow| {
            r.id = "request_requisition_b_line_a".to_string();
            r.requisition_id = "request_requisition_b".to_string();
            r.item_link_id = "item_e".to_string();
            r.requested_quantity = 100.0;
        })
    }

    #[actix_rt::test]
    async fn get_response_requisition_line_stats_success() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "get_response_requisition_line_stats_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.requisitions = vec![
                    requisition_one(),
                    requisition_two(),
                    request_requisition_a(),
                    request_requisition_b(),
                ];
                r.requisition_lines = vec![
                    requisition_line_one_a(),
                    requisition_line_one_b(),
                    requisition_line_two_a(),
                    request_requisition_a_line_a(),
                    request_requisition_b_line_a(),
                ]
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        let stats = service
            .get_response_requisition_line_stats(&context, &requisition_line_one_b().id)
            .unwrap();
        let response_requisition_stats = ResponseRequisitionStats {
            response_store_stats: ResponseStoreStats {
                stock_on_hand: 0.0,
                stock_on_order: request_requisition_a_line_a().requested_quantity,
                incoming_stock: 0,
                requested_quantity: requisition_line_one_b().requested_quantity,
                other_requested_quantity: requisition_line_one_a().requested_quantity,
            },
            request_store_stats: RequestStoreStats {
                stock_on_hand: requisition_line_one_b().available_stock_on_hand,
                amc: requisition_line_one_b().average_monthly_consumption,
                max_months_of_stock: requisition_one().max_months_of_stock,
                suggested_quantity: requisition_line_one_b().suggested_quantity,
            },
        };

        assert_eq!(stats, response_requisition_stats);
    }
}
