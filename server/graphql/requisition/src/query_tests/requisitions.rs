mod graphql {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{mock_name_a, mock_request_draft_requisition_all_fields, MockDataInserts},
        requisition_row::{RequisitionStatus, RequisitionType},
        DateFilter, Requisition, RequisitionFilter, RequisitionSort, RequisitionSortField,
        StorageConnectionManager,
    };
    use repository::{DatetimeFilter, EqualFilter, PaginationOption, StringFilter};
    use serde_json::json;
    use service::{
        requisition::RequisitionServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };
    use util::inline_init;

    use crate::RequisitionQueries;

    type GetRequisition = dyn Fn(
            Option<PaginationOption>,
            Option<RequisitionFilter>,
            Option<RequisitionSort>,
        ) -> Result<ListResult<Requisition>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetRequisition>);

    impl RequisitionServiceTrait for TestService {
        fn get_requisitions(
            &self,
            _: &ServiceContext,
            _: Option<&str>,
            pagination: Option<PaginationOption>,
            filter: Option<RequisitionFilter>,
            sort: Option<RequisitionSort>,
        ) -> Result<ListResult<Requisition>, ListError> {
            self.0(pagination, filter, sort)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.requisition_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_get_requisitions() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            RequisitionQueries,
            EmptyMutation,
            "test_graphql_get_requisitions",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query($page: PaginationInput, $filter: RequisitionFilterInput, $sort: [RequisitionSortInput!]) {
          requisitions(filter: $filter, page: $page, sort: $sort, storeId: \"store_a\") {
            ... on RequisitionConnector {
              nodes {
                id
              }
              totalCount
            }
          }
       }
        "#;

        // Test list error
        let test_service = TestService(Box::new(|_, _, _| Err(ListError::LimitBelowMin(20))));

        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &None,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // All variables and result
        let variables = json!({
          "page": {
            "first": 10,
            "offset": 20,
          },
          "sort": [{
            "key": "requisitionNumber",
            "desc": true
          }],
          "filter": {
            "id": {
                "notEqualTo": "id_not_equal_to"
            },
            "userId": {
                "notEqualTo": "user_id_not_equal_to"
            },
            "requisitionNumber": {
                "equalTo": 20
            },
            "type": {
                "equalTo": "REQUEST"
            },
            "status": {
                "equalTo": "DRAFT"
            },
            "createdDatetime": {
                "equalTo": "2021-01-01T00:00:00+00:00"
            },
            "sentDatetime": {
                "afterOrEqualTo": "2021-01-02T00:00:00+00:00"
            },
            "finalisedDatetime": {
                "beforeOrEqualTo": "2021-01-03T00:00:00+00:00"
            },
            "expectedDeliveryDate": {
                "afterOrEqualTo": "2021-01-04"
            },
            "otherPartyName": {
                "like": "like_other_party_name"
            },
            "otherPartyId": {
                "equalAny": ["one", "two"]
            },
            "colour": {
                "equalTo": "equal_to_color"
            },
            "theirReference": {
                "like": "like_their_reference"
            },
            "comment": {
                "equalTo": "equal_to_comment"
            }
          }
        });

        let expected = json!({
            "requisitions": {
                "nodes": [{
                    "id": mock_request_draft_requisition_all_fields().requisition.id,
                }],
                "totalCount": 1
            }
        }
        );

        let test_service = TestService(Box::new(|page, filter, sort| {
            assert_eq!(
                sort,
                Some(RequisitionSort {
                    key: RequisitionSortField::RequisitionNumber,
                    desc: Some(true)
                })
            );
            assert_eq!(
                page,
                Some(PaginationOption {
                    offset: Some(20),
                    limit: Some(10)
                })
            );
            let RequisitionFilter {
                id,
                user_id,
                requisition_number,
                r#type,
                status,
                created_datetime,
                sent_datetime,
                finalised_datetime,
                expected_delivery_date,
                name,
                name_id,
                colour,
                their_reference,
                comment,
                store_id: _,
                linked_requisition_id: _,
                order_type: _,
                a_shipment_has_been_created: _,
            } = filter.unwrap();

            assert_eq!(id, Some(EqualFilter::not_equal_to("id_not_equal_to")));
            assert_eq!(
                user_id,
                Some(EqualFilter::not_equal_to("user_id_not_equal_to"))
            );
            assert_eq!(requisition_number, Some(EqualFilter::equal_to_i64(20)));
            assert_eq!(r#type, Some(RequisitionType::Request.equal_to()));
            assert_eq!(status, Some(RequisitionStatus::Draft.equal_to()));
            assert_eq!(
                created_datetime,
                Some(DatetimeFilter::equal_to(
                    NaiveDate::from_ymd_opt(2021, 1, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                ))
            );
            assert_eq!(
                sent_datetime,
                Some(DatetimeFilter::after_or_equal_to(
                    NaiveDate::from_ymd_opt(2021, 1, 2)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                ))
            );
            assert_eq!(
                finalised_datetime,
                Some(DatetimeFilter::before_or_equal_to(
                    NaiveDate::from_ymd_opt(2021, 1, 3)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                ))
            );
            assert_eq!(
                expected_delivery_date,
                Some(DateFilter::after_or_equal_to(
                    NaiveDate::from_ymd_opt(2021, 1, 4).unwrap()
                ))
            );
            assert_eq!(name, Some(StringFilter::like("like_other_party_name")));
            assert_eq!(
                name_id,
                Some(EqualFilter::equal_any(vec![
                    "one".to_owned(),
                    "two".to_owned()
                ]))
            );
            assert_eq!(colour, Some(EqualFilter::equal_to("equal_to_color")));
            assert_eq!(
                their_reference,
                Some(StringFilter::like("like_their_reference"))
            );
            assert_eq!(comment, Some(StringFilter::equal_to("equal_to_comment")));

            Ok(ListResult {
                rows: vec![inline_init(|r: &mut Requisition| {
                    r.requisition_row = mock_request_draft_requisition_all_fields().requisition;
                    r.name_row = mock_name_a();
                })],
                count: 1,
            })
        }));

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
