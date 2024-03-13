#[cfg(test)]
mod tests {

    use async_graphql::{EmptyMutation, MergedObject};
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use graphql_general::GeneralQueries;
    use graphql_invoice::InvoiceQueries;
    use graphql_invoice_line::InvoiceLineQueries;
    use graphql_location::LocationQueries;
    use graphql_requisition::RequisitionQueries;
    use graphql_stocktake::StocktakeQueries;
    use graphql_stocktake_line::StocktakeLineQueries;
    use repository::mock::{
        mock_outbound_shipment_a, mock_outbound_shipment_a_invoice_lines,
        mock_request_draft_requisition_all_fields, mock_stocktake_a, mock_stocktake_line_a,
        MockDataInserts,
    };
    use serde_json::json;
    use service::report::{default_queries::get_default_gql_query, definition::DefaultQuery};

    #[derive(MergedObject, Default, Clone)]
    struct FullQuery(
        pub InvoiceQueries,
        pub InvoiceLineQueries,
        pub LocationQueries,
        pub StocktakeQueries,
        pub StocktakeLineQueries,
        pub GeneralQueries,
        pub RequisitionQueries,
    );

    fn full_query() -> FullQuery {
        FullQuery(
            InvoiceQueries,
            InvoiceLineQueries,
            LocationQueries,
            StocktakeQueries,
            StocktakeLineQueries,
            GeneralQueries,
            RequisitionQueries,
        )
    }

    #[actix_rt::test]
    async fn test_default_queries() {
        let (_, _, _, settings) = setup_graphql_test(
            full_query(),
            EmptyMutation,
            "test_default_report_queries",
            MockDataInserts::all(),
        )
        .await;

        // invoice
        let query = get_default_gql_query(DefaultQuery::Invoice).query;
        let mock_invoice = mock_outbound_shipment_a();
        let expected = json!({
          "invoice": {
            "id": mock_invoice.id
          },
          "invoiceLines": {
            "nodes": [{
              "id": mock_outbound_shipment_a_invoice_lines()[0].id
            }]
          },
          "store": {
            "id": mock_invoice.store_id
          }
        });
        let variables = Some(json!({
            "storeId": mock_invoice.store_id,
            "dataId": mock_invoice.id,
            "sort": {
                "key": "itemName",
                "desc": false
            }
        }));
        assert_graphql_query!(&settings, &query, &variables, &expected, None);

        // stocktake
        let query = get_default_gql_query(DefaultQuery::Stocktake).query;
        let mock_stocktake = mock_stocktake_a();
        let expected = json!({
          "stocktake": {
            "id": mock_stocktake.id
          },
          "stocktakeLines": {
            "nodes": [{
              "id": mock_stocktake_line_a().id
            }]
          },
          "store": {
            "id": mock_stocktake.store_id
          }
        });
        let variables = Some(json!({
            "storeId": mock_stocktake.store_id,
            "dataId": mock_stocktake.id,
            "sort": {
                "key": "itemName",
                "desc": false
            }
        }));
        assert_graphql_query!(&settings, &query, &variables, &expected, None);

        // requisition
        let query = get_default_gql_query(DefaultQuery::Requisition).query;
        let mock_requisition = mock_request_draft_requisition_all_fields().requisition;
        let expected = json!({
          "requisition": {
            "id": mock_requisition.id
          },
          "store": {
            "id": mock_requisition.store_id
          }
        });
        let variables = Some(json!({
            "storeId": mock_requisition.store_id,
            "dataId": mock_requisition.id,
        }));
        assert_graphql_query!(&settings, &query, &variables, &expected, None);
    }
}
