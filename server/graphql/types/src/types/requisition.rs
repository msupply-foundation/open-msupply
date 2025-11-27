use self::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use graphql_core::{
    loader::{
        InvoiceByRequisitionIdLoader, NameByIdLoader, NameByIdLoaderInput,
        RequisitionLinesByRequisitionIdLoader, RequisitionLinesRemainingToSupplyLoader,
        RequisitionsByIdLoader, SyncFileReferenceLoader, UserLoader,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{requisition_row::RequisitionRow, ApprovalStatusType, NameRow, Requisition};
use service::ListResult;

use super::{
    program_node::ProgramNode, InvoiceConnector, NameNode, PeriodNode, RequisitionLineConnector,
    UserNode,
};
use crate::types::SyncFileReferenceConnector;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::requisition::requisition_row::RequisitionType")]
pub enum RequisitionNodeType {
    /// Requisition created by store that is ordering stock
    Request,
    /// Supplying store requisition in response to request requisition
    Response,
}

/// Approval status is applicable to response requisition only
#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::requisition::requisition_row::ApprovalStatusType")]
pub enum RequisitionNodeApprovalStatus {
    // Requisition is editable, no approval required
    None,
    /// Pending authorisation, requisition should not be editable
    Pending,
    /// Approved
    Approved,
    /// Approval was denied, requisition is not editable
    Denied,
    AutoApproved,
    ApprovedByAnother,
    DeniedByAnother,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::requisition::requisition_row::RequisitionStatus")]
pub enum RequisitionNodeStatus {
    /// New requisition when manually created
    Draft,
    /// New requisition when automatically created, only applicable to response requisition when it's duplicated in supplying store from request requisition
    New,
    /// Request requisition is sent and locked for future editing, only applicable to request requisition
    Sent,
    /// Response requisition: When supplier finished fulfilling requisition, locked for future editing
    /// Request requisition: When response requisition is finalised
    Finalised,
}

#[derive(PartialEq, Debug)]
pub struct RequisitionNode {
    requisition: Requisition,
}

#[derive(SimpleObject)]
pub struct RequisitionConnector {
    total_count: u32,
    nodes: Vec<RequisitionNode>,
}

#[Object]
impl RequisitionNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn r#type(&self) -> RequisitionNodeType {
        RequisitionNodeType::from(self.row().r#type.clone())
    }

    pub async fn status(&self) -> RequisitionNodeStatus {
        RequisitionNodeStatus::from(self.row().status.clone())
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }

    pub async fn expected_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().expected_delivery_date
    }

    pub async fn approval_status(&self) -> RequisitionNodeApprovalStatus {
        RequisitionNodeApprovalStatus::from(
            self.row()
                .approval_status
                .clone()
                .unwrap_or(ApprovalStatusType::None),
        )
    }

    /// User that last edited requisition, if user is not found in system default unknown user is returned
    /// Null is returned for transfers, where response requisition has not been edited yet
    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();

        let user_id = match &self.row().user_id {
            Some(user_id) => user_id,
            None => return Ok(None),
        };

        let result = loader
            .load_one(user_id.clone())
            .await?
            .map(UserNode::from_domain);

        Ok(result)
    }

    /// Applicable to request requisition only
    pub async fn sent_datetime(&self) -> Option<DateTime<Utc>> {
        let sent_datetime = self.row().sent_datetime;
        sent_datetime.map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn finalised_datetime(&self) -> Option<DateTime<Utc>> {
        let finalised_datetime = self.row().finalised_datetime;
        finalised_datetime.map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn requisition_number(&self) -> &i64 {
        &self.row().requisition_number
    }

    pub async fn colour(&self) -> &Option<String> {
        &self.row().colour
    }

    pub async fn their_reference(&self) -> &Option<String> {
        &self.row().their_reference
    }

    // TODO our reference ? How does their reference reflect in other half of requisition ?

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    /// Request Requisition: Supplying store (store that is supplying stock)
    /// Response Requisition: Customer store (store that is ordering stock)
    pub async fn other_party(&self, ctx: &Context<'_>, store_id: String) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let response_option = loader
            .load_one(NameByIdLoaderInput::new(&store_id, &self.name_row().id))
            .await?;

        response_option.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name ({}) linked to requisition ({})",
                &self.name_row().id,
                &self.row().id
            ))
            .extend(),
        )
    }

    pub async fn other_party_name(&self) -> &str {
        &self.name_row().name
    }

    pub async fn other_party_id(&self) -> &str {
        &self.name_row().id
    }

    pub async fn destination_customer(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Option<NameNode>> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let original_customer_id = match &self.requisition.requisition_row.original_customer_id {
            Some(customer) => customer,
            None => return Ok(None),
        };

        let response_option = loader
            .load_one(NameByIdLoaderInput::new(&store_id, original_customer_id))
            .await?;

        match response_option {
            Some(name) => Ok(Some(NameNode::from_domain(name))),
            None => Ok(None),
        }
    }

    /// Maximum calculated quantity, used to deduce calculated quantity for each line, see calculated in requisition line
    pub async fn max_months_of_stock(&self) -> &f64 {
        &self.row().max_months_of_stock
    }

    /// Minimum quantity to have for stock to be ordered, used to deduce calculated quantity for each line, see calculated in requisition line
    pub async fn min_months_of_stock(&self) -> &f64 {
        &self.row().min_months_of_stock
    }

    pub async fn documents(&self, ctx: &Context<'_>) -> Result<SyncFileReferenceConnector> {
        let requisition_id = &self.row().id;
        let linked_requisition_id = &self.row().linked_requisition_id;

        // Load documents for both requisition and linked requisition
        let mut record_ids = vec![requisition_id.to_string()];
        if let Some(linked_id) = linked_requisition_id {
            record_ids.push(linked_id.to_string());
        }

        let loader = ctx.get_loader::<DataLoader<SyncFileReferenceLoader>>();
        let results = loader.load_many(record_ids).await?;
        let all_documents = results.into_values().flatten().collect();

        Ok(SyncFileReferenceConnector::from_vec(all_documents))
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<RequisitionLineConnector> {
        let loader = ctx.get_loader::<DataLoader<RequisitionLinesByRequisitionIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);

        Ok(RequisitionLineConnector::from_vec(result))
    }

    /// Linked requisition
    pub async fn linked_requisition(&self, ctx: &Context<'_>) -> Result<Option<RequisitionNode>> {
        let linked_requisition_id = if let Some(id) = &self.row().linked_requisition_id {
            id
        } else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<RequisitionsByIdLoader>>();

        Ok(loader
            .load_one(linked_requisition_id.clone())
            .await?
            .map(RequisitionNode::from_domain))
    }

    /// Response Requisition: Outbound Shipments linked requisition
    /// Request Requisition: Inbound Shipments linked to requisition
    pub async fn shipments(&self, ctx: &Context<'_>) -> Result<InvoiceConnector> {
        let loader = ctx.get_loader::<DataLoader<InvoiceByRequisitionIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);

        Ok(InvoiceConnector::from_vec(result))
    }

    /// All lines that have not been supplied
    /// based on same logic as RequisitionLineNode.remainingQuantityToSupply
    /// only applicable to Response requisition, Request requisition will empty connector
    pub async fn lines_remaining_to_supply(
        &self,
        ctx: &Context<'_>,
    ) -> Result<RequisitionLineConnector> {
        let loader = ctx.get_loader::<DataLoader<RequisitionLinesRemainingToSupplyLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);

        Ok(RequisitionLineConnector::from_vec(result))
    }

    pub async fn program(&self) -> Option<ProgramNode> {
        self.requisition
            .program
            .as_ref()
            .map(|program| ProgramNode {
                program_row: program.to_owned(),
            })
    }

    #[graphql(deprecation = "use `program.name` instead.")]
    pub async fn program_name(&self) -> Option<String> {
        self.requisition.program.as_ref().map(|p| p.name.to_owned())
    }

    pub async fn order_type(&self) -> &Option<String> {
        &self.row().order_type
    }

    pub async fn period(&self) -> Option<PeriodNode> {
        self.requisition
            .period
            .as_ref()
            .map(|period| PeriodNode::from_domain(period.to_owned()))
    }

    pub async fn is_emergency(&self) -> bool {
        self.row().is_emergency
    }

    pub async fn created_from_requisition(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<RequisitionNode>> {
        let created_from_requisition_id = match &self.row().created_from_requisition_id {
            Some(id) => id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<RequisitionsByIdLoader>>();

        Ok(loader
            .load_one(created_from_requisition_id.clone())
            .await?
            .map(RequisitionNode::from_domain))
    }

    pub async fn created_from_requisition_id(&self) -> &Option<String> {
        &self.row().created_from_requisition_id
    }

    // % allocated ?
    // % shipped ?
    // lead time ?
}

impl RequisitionNode {
    pub fn row(&self) -> &RequisitionRow {
        &self.requisition.requisition_row
    }

    pub fn name_row(&self) -> &NameRow {
        &self.requisition.name_row
    }

    pub fn from_domain(requisition: Requisition) -> RequisitionNode {
        RequisitionNode { requisition }
    }
}

impl RequisitionConnector {
    pub fn from_domain(requisitions: ListResult<Requisition>) -> RequisitionConnector {
        RequisitionConnector {
            total_count: requisitions.count,
            nodes: requisitions
                .rows
                .into_iter()
                .map(RequisitionNode::from_domain)
                .collect(),
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::{EmptyMutation, Object};

    use graphql_core::{
        assert_graphql_query,
        test_helpers::{setup_graphql_test, setup_graphql_test_with_data},
    };
    use repository::{
        mock::{mock_user_account_a, MockDataInserts},
        Requisition, RequisitionRow,
    };
    use serde_json::json;

    use crate::types::RequisitionNode;

    #[actix_rt::test]
    async fn graphql_requisition_user_loader() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphql_requisition_user_loader",
            MockDataInserts::none().user_accounts(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query_user_exists(&self) -> RequisitionNode {
                RequisitionNode {
                    requisition: Requisition {
                        requisition_row: RequisitionRow {
                            user_id: Some(mock_user_account_a().id),
                            ..Default::default()
                        },
                        ..Default::default()
                    },
                }
            }
            pub async fn test_query_user_does_not_exist(&self) -> RequisitionNode {
                RequisitionNode {
                    requisition: Requisition {
                        requisition_row: RequisitionRow {
                            user_id: Some("does not exist".to_string()),
                            ..Default::default()
                        },
                        ..Default::default()
                    },
                }
            }
            pub async fn test_query_user_not_associated(&self) -> RequisitionNode {
                RequisitionNode {
                    requisition: Requisition {
                        requisition_row: RequisitionRow {
                            user_id: None,
                            ..Default::default()
                        },
                        ..Default::default()
                    },
                }
            }
        }

        let expected = json!({
            "testQueryUserExists": {
                "user": {
                    "userId": mock_user_account_a().id
                }
            },
            "testQueryUserNotAssociated": {
                "user": null
            },
        }
        );

        let query = r#"
        query {
            testQueryUserExists {
                ...user
            }
            testQueryUserDoesNotExist {
                ...user
            }
            testQueryUserNotAssociated {
                ...user
            }           
        }
        fragment user on RequisitionNode {
            user {
                userId
            }
        }
        "#;

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }

    #[actix_rt::test]
    async fn graphql_requisition_lines_remaining_to_supply_loader() {
        use repository::mock::test_remaining_to_supply as TestData;
        #[derive(Clone)]
        struct TestQuery;
        let (_, _, _, settings) = setup_graphql_test_with_data(
            TestQuery,
            EmptyMutation,
            "graphql_requisition_lines_remaining_to_supply_loader",
            MockDataInserts::all(),
            TestData::test_remaining_to_supply(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> RequisitionNode {
                RequisitionNode {
                    requisition: Requisition {
                        requisition_row: TestData::requisition(),
                        ..Default::default()
                    },
                }
            }
        }

        let query = r#"
        query { 
            testQuery {
                linesRemainingToSupply {
                    totalCount
                }
            }
        }
        "#;

        let expected = json!({
            "testQuery": {
                "linesRemainingToSupply": {
                    // TestData::line_to_supply_q0() should not be filtered out
                    "totalCount": 3
                  }
            }
        }
        );

        assert_graphql_query!(&settings, query, &None, &expected, None);
    }
}
