mod graphql {
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test_with_data};
    use repository::{
        item_variant::packaging_variant_row::{PackagingVariantRow, PackagingVariantRowRepository},
        mock::{mock_item_a_variant_1, MockData, MockDataInserts},
    };
    use serde_json::json;
    use service::sync::test_util_set_is_central_server;

    use crate::{GeneralMutations, GeneralQueries};

    const BARCODE_BY_GTIN: &str = r#"query barcodeByGtin($gtin: String!) {
        barcodeByGtin(storeId: \"store_a\", gtin: $gtin) {
            __typename
            ... on BarcodeNode { id gtin itemId packSize }
        }
    }"#;

    const INSERT_BARCODE: &str = r#"mutation insertBarcode($input: InsertBarcodeInput!) {
        insertBarcode(storeId: \"store_a\", input: $input) {
            ... on BarcodeNode { gtin itemId packSize }
        }
    }"#;

    /// The deprecated barcodeByGtin and insertBarcode keep answering clients that
    /// predate barcodeMatches and proposeBarcode
    #[actix_rt::test]
    async fn test_graphql_legacy_barcode_operations() {
        let (_, connection, _, settings) = setup_graphql_test_with_data(
            GeneralQueries,
            GeneralMutations,
            "test_graphql_legacy_barcode_operations",
            MockDataInserts::all(),
            MockData::default(),
        )
        .await;
        PackagingVariantRowRepository::new(&connection)
            .upsert_one(&PackagingVariantRow {
                id: "packaging_a".to_string(),
                name: "Box".to_string(),
                item_variant_id: mock_item_a_variant_1().id,
                packaging_level: 1,
                pack_size: Some(1.0),
                barcode: Some("plain:0123456789".to_string()),
                ..Default::default()
            })
            .unwrap();

        // A confirmed barcode answers with its item
        let expected = json!({ "barcodeByGtin": {
            "__typename": "BarcodeNode",
            "id": "packaging_a",
            "gtin": "0123456789",
            "itemId": "item_a",
            "packSize": 1.0
        }});
        let variables = Some(json!({ "gtin": "0123456789" }));
        assert_graphql_query!(&settings, BARCODE_BY_GTIN, &variables, &expected, None);

        // An unknown barcode is RecordNotFound, so the client asks for the item
        let not_found = json!({ "barcodeByGtin": { "__typename": "NodeError" } });
        let variables = Some(json!({ "gtin": "LEGACY-1" }));
        assert_graphql_query!(&settings, BARCODE_BY_GTIN, &variables, &not_found, None);

        // Off central, inserting proposes: the scan then finds it on this site
        test_util_set_is_central_server(false);
        let variables = Some(json!({ "input": {
            "gtin": "LEGACY-1", "itemId": "item_a", "packSize": 2.0
        }}));
        let expected = json!({ "insertBarcode": {
            "gtin": "LEGACY-1", "itemId": "item_a", "packSize": 2.0
        }});
        assert_graphql_query!(&settings, INSERT_BARCODE, &variables, &expected, None);

        let variables = Some(json!({ "gtin": "LEGACY-1" }));
        let expected = json!({ "barcodeByGtin": {
            "__typename": "BarcodeNode", "itemId": "item_a", "packSize": 2.0
        }});
        assert_graphql_query!(&settings, BARCODE_BY_GTIN, &variables, &expected, None);

        // Proposed for a second item too: one answer would be a guess, so the
        // client is asked which item it is
        let variables = Some(json!({ "input": { "gtin": "LEGACY-1", "itemId": "item_b" } }));
        let expected = json!({ "insertBarcode": { "gtin": "LEGACY-1", "itemId": "item_b" } });
        assert_graphql_query!(&settings, INSERT_BARCODE, &variables, &expected, None);

        let variables = Some(json!({ "gtin": "LEGACY-1" }));
        assert_graphql_query!(&settings, BARCODE_BY_GTIN, &variables, &not_found, None);

        // On central, inserting adds a confirmed barcode, on the item's
        // auto-created variant
        test_util_set_is_central_server(true);
        let variables = Some(json!({ "input": { "gtin": "LEGACY-2", "itemId": "item_b" } }));
        let expected = json!({ "insertBarcode": { "gtin": "LEGACY-2", "itemId": "item_b" } });
        assert_graphql_query!(&settings, INSERT_BARCODE, &variables, &expected, None);

        let query = r#"query {
            barcodeMatches(storeId: \"store_a\", barcode: \"LEGACY-2\") { status itemId }
        }"#;
        let expected = json!({ "barcodeMatches": [
            { "status": "CONFIRMED", "itemId": "item_b" }
        ]});
        assert_graphql_query!(&settings, query, &None, &expected, None);
    }
}
