use self::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use graphql_core::{
    loader::{
        InvoiceByRequisitionIdLoader, NameByIdLoader, NameByIdLoaderInput,
        RequisitionLinesByRequisitionIdLoader, RequisitionLinesRemainingToSupplyLoader,
        RequisitionsByIdLoader, UserLoader,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    requisition_row::{RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    unknown_user, NameRow, PeriodRow, Requisition, RequisitionRowApprovalStatus,
};
use service::ListResult;

use super::{InvoiceConnector, NameNode, PeriodNode, RequisitionLineConnector, UserNode};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum RequisitionNodeType {
    /// Requisition created by store that is ordering stock
    Request,
    /// Supplying store requisition in response to request requisition
    Response,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
/// Approval status is applicable to response requisition only
pub enum RequisitionNodeApprovalStatus {
    // Requisition is editable, no approval required
    None,
    /// Pending authorisation, requisition should not be editable
    Pending,
    /// Approved
    Approved,
    /// Approval was denied, requisition is not editable
    Denied,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
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
        RequisitionNodeType::from_domain(&self.row().r#type)
    }

    pub async fn status(&self) -> RequisitionNodeStatus {
        RequisitionNodeStatus::from_domain(&self.row().status)
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }

    pub async fn expected_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().expected_delivery_date
    }

    pub async fn approval_status(&self) -> RequisitionNodeApprovalStatus {
        self.row()
            .approval_status
            .as_ref()
            .map(RequisitionNodeApprovalStatus::from_domain)
            .unwrap_or(RequisitionNodeApprovalStatus::None)
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
            .unwrap_or(unknown_user());

        Ok(Some(UserNode::from_domain(result)))
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

    /// Maximum calculated quantity, used to deduce calculated quantity for each line, see calculated in requisition line
    pub async fn max_months_of_stock(&self) -> &f64 {
        &self.row().max_months_of_stock
    }

    /// Minimum quantity to have for stock to be ordered, used to deduce calculated quantity for each line, see calculated in requisition line
    pub async fn min_months_of_stock(&self) -> &f64 {
        &self.row().min_months_of_stock
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

    pub async fn program_name(&self) -> &Option<String> {
        &self.requisition.program_name
    }

    pub async fn order_type(&self) -> &Option<String> {
        &self.row().order_type
    }

    pub async fn period(&self) -> Option<PeriodNode> {
        match &self.requisition.period {
            Some(period) => Some(PeriodNode::from_domain(period.to_owned())),
            None => None,
        }
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

    pub fn period_row(&self) -> &Option<PeriodRow> {
        &self.requisition.period
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

impl RequisitionNodeType {
    pub fn to_domain(self) -> RequisitionRowType {
        use RequisitionNodeType::*;
        match self {
            Request => RequisitionRowType::Request,
            Response => RequisitionRowType::Response,
        }
    }

    pub fn from_domain(r#type: &RequisitionRowType) -> RequisitionNodeType {
        use RequisitionRowType::*;
        match r#type {
            Request => RequisitionNodeType::Request,
            Response => RequisitionNodeType::Response,
        }
    }
}

impl RequisitionNodeApprovalStatus {
    fn from_domain(status: &RequisitionRowApprovalStatus) -> Self {
        use RequisitionRowApprovalStatus::*;
        match status {
            None => Self::None,
            Approved => Self::Approved,
            Pending => Self::Pending,
            Denied => Self::Denied,
            AutoApproved => Self::Approved,
            ApprovedByAnother => Self::Approved,
            DeniedByAnother => Self::Denied,
        }
    }
}

impl RequisitionNodeStatus {
    pub fn to_domain(self) -> RequisitionRowStatus {
        use RequisitionNodeStatus::*;
        match self {
            Draft => RequisitionRowStatus::Draft,
            New => RequisitionRowStatus::New,
            Sent => RequisitionRowStatus::Sent,
            Finalised => RequisitionRowStatus::Finalised,
        }
    }

    pub fn from_domain(status: &RequisitionRowStatus) -> RequisitionNodeStatus {
        use RequisitionRowStatus::*;
        match status {
            Draft => RequisitionNodeStatus::Draft,
            New => RequisitionNodeStatus::New,
            Sent => RequisitionNodeStatus::Sent,
            Finalised => RequisitionNodeStatus::Finalised,
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
        unknown_user, Requisition, RequisitionRow,
    };
    use serde_json::json;
    use util::inline_init;

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
                    requisition: inline_init(|r: &mut Requisition| {
                        r.requisition_row = inline_init(|r: &mut RequisitionRow| {
                            r.user_id = Some(mock_user_account_a().id);
                        })
                    }),
                }
            }
            pub async fn test_query_user_does_not_exist(&self) -> RequisitionNode {
                RequisitionNode {
                    requisition: inline_init(|r: &mut Requisition| {
                        r.requisition_row = inline_init(|r: &mut RequisitionRow| {
                            r.user_id = Some("does not exist".to_string());
                        })
                    }),
                }
            }
            pub async fn test_query_user_not_associated(&self) -> RequisitionNode {
                RequisitionNode {
                    requisition: inline_init(|r: &mut Requisition| {
                        r.requisition_row = inline_init(|r: &mut RequisitionRow| r.user_id = None)
                    }),
                }
            }
        }

        let expected = json!({
            "testQueryUserExists": {
                "user": {
                    "userId": mock_user_account_a().id
                }
            },
            "testQueryUserDoesNotExist": {
                "user": {
                    "userId": unknown_user().user_row.id
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
                    requisition: inline_init(|r: &mut Requisition| {
                        r.requisition_row = TestData::requisition()
                    }),
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
