mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::{MockDataInserts, mock_request_draft_requisition};
    use serde_json::json;

    use crate::RequisitionQueries;

    // A named `type` narrows the single read, so a detail screen can't be
    // handed a requisition of the other kind (#1746).
    #[actix_rt::test]
    async fn test_graphql_requisition_type_pin() {
        let (_, _, _, settings) = setup_graphql_test(
            RequisitionQueries,
            EmptyMutation,
            "test_graphql_requisition_type_pin",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query($storeId: String!, $id: String!, $type: RequisitionNodeType) {
          requisition(storeId: $storeId, id: $id, type: $type) {
            __typename
            ... on RequisitionNode {
              id
            }
          }
        }
        "#;

        let request = mock_request_draft_requisition();
        let found = json!({
            "requisition": { "__typename": "RequisitionNode", "id": &request.id }
        });
        let not_found = json!({
            "requisition": { "__typename": "RecordNotFound" }
        });

        // No type: any kind resolves, as before.
        let variables = json!({ "storeId": "store_a", "id": &request.id });
        assert_graphql_query!(&settings, query, &Some(variables), &found, None);

        // The matching type resolves.
        let variables = json!({ "storeId": "store_a", "id": &request.id, "type": "REQUEST" });
        assert_graphql_query!(&settings, query, &Some(variables), &found, None);

        // The other type is not found.
        let variables = json!({ "storeId": "store_a", "id": &request.id, "type": "RESPONSE" });
        assert_graphql_query!(&settings, query, &Some(variables), &not_found, None);
    }
}
