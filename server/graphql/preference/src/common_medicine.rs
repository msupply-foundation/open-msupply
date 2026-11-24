use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::{CommonMedicineNode, OkResponse};
use service::{
    auth::{Resource, ResourceAccessRequest},
    common_medicine::{
        CommonMedicine, UpsertCommonMedicinesError, get_common_medicines, upsert_common_medicines,
    },
};

#[derive(InputObject)]
pub struct CommonMedicineInput {
    pub item_id: String,
    /// Up to three amounts, in the item's own unit; empty for a card that asks
    /// for the amount
    pub amounts: Vec<f64>,
}

#[derive(Default, Clone)]
pub struct CommonMedicineQueries;

#[Object]
impl CommonMedicineQueries {
    /// The medicines a store shows as cards on the Simple dispensing screen,
    /// in card order (#2188)
    pub async fn common_medicines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Vec<CommonMedicineNode>> {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryCommonMedicines,
                store_id: Some(store_id.clone()),
                require_central_standalone: false,
            },
        )?;
        let service_context = ctx.service_provider().basic_context()?;

        Ok(
            get_common_medicines(&service_context.connection, &store_id)?
                .into_iter()
                .map(CommonMedicineNode::from_domain)
                .collect(),
        )
    }
}

#[derive(Default, Clone)]
pub struct CommonMedicineMutations;

#[Object]
impl CommonMedicineMutations {
    /// Replaces a store's common medicines with this list, in this order
    /// (#2188). Saved at the store's own site, by staff who can change
    /// dispensing records there.
    pub async fn upsert_common_medicines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: Vec<CommonMedicineInput>,
    ) -> Result<OkResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::MutateCommonMedicines,
                store_id: Some(store_id.clone()),
                require_central_standalone: false,
            },
        )?;
        let service_context = ctx
            .service_provider()
            .context(store_id.clone(), user.user_id)?;

        let medicines = input
            .into_iter()
            .map(|CommonMedicineInput { item_id, amounts }| CommonMedicine { item_id, amounts })
            .collect();

        upsert_common_medicines(&service_context, &store_id, medicines).map_err(
            |error| match error {
                // A list that breaks a rule is the caller's to fix
                UpsertCommonMedicinesError::InvalidValue(_) => {
                    StandardGraphqlError::BadUserInput(error.to_string()).extend()
                }
                UpsertCommonMedicinesError::DatabaseError(_) => error.into(),
            },
        )?;

        Ok(OkResponse)
    }
}

#[cfg(test)]
mod test {
    use super::{CommonMedicineMutations, CommonMedicineQueries};
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::mock::{MockDataInserts, mock_item_a, mock_item_b, mock_store_a};
    use serde_json::json;

    const SAVE: &str = r#"mutation Save($storeId: String!, $input: [CommonMedicineInput!]!) {
        upsertCommonMedicines(storeId: $storeId, input: $input) {
            __typename
        }
    }"#;

    const READ: &str = r#"query Read($storeId: String!) {
        commonMedicines(storeId: $storeId) {
            itemId
            amounts
        }
    }"#;

    // OMS-REG-DIS-12.236, .239: a list saved through the mutation reads back in
    // its order, and a list that breaks the rules is the caller's error, which
    // the editor can tell from a server fault
    #[actix_rt::test]
    async fn save_and_read_common_medicines() {
        let (_, _, _, settings) = setup_graphql_test(
            CommonMedicineQueries,
            CommonMedicineMutations,
            "graphql_common_medicines",
            MockDataInserts::all(),
        )
        .await;
        let store = mock_store_a().id;
        let list = json!([
            { "itemId": mock_item_b().id, "amounts": [10.0, 20.0] },
            { "itemId": mock_item_a().id, "amounts": [] }
        ]);

        assert_graphql_query!(
            &settings,
            SAVE,
            &Some(json!({ "storeId": store, "input": list })),
            &json!({ "upsertCommonMedicines": { "__typename": "OkResponse" } }),
            None
        );
        assert_graphql_query!(
            &settings,
            READ,
            &Some(json!({ "storeId": store })),
            &json!({ "commonMedicines": list }),
            None
        );

        assert_standard_graphql_error!(
            &settings,
            SAVE,
            &Some(json!({
                "storeId": store,
                "input": [{ "itemId": mock_item_a().id, "amounts": [0.0] }]
            })),
            "Bad user input",
            None,
            None
        );
    }
}
