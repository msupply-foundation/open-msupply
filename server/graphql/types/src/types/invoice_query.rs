use crate::types::{PurchaseOrderNode, ShippingMethodNode, SyncFileReferenceConnector};

use super::patient::PatientNode;
use super::program_node::ProgramNode;
use super::{
    ClinicianNode, CurrencyNode, DiagnosisNode, InsurancePolicyNode, InvoiceLineConnector,
    NameNode, RequisitionNode, StoreNode, UserNode,
};
use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use dataloader::DataLoader;

use graphql_core::loader::{
    CurrencyByIdLoader, DiagnosisLoader, InvoiceByIdLoader, InvoiceLineByInvoiceIdLoader,
    NameByIdLoaderInput, NameByNameLinkIdLoader, NameByNameLinkIdLoaderInput,
    NameInsuranceJoinLoader, PatientLoader, ProgramByIdLoader, PurchaseOrderByIdLoader,
    ShippingMethodByIdLoader, SyncFileReferenceLoader, UserLoader,
};
use graphql_core::{
    loader::{InvoiceStatsLoader, NameByIdLoader, RequisitionsByIdLoader},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    ClinicianRow, InvoiceRow, Name, NameLinkRow, NameRow, PricingRow, Store, StoreRow,
};

use repository::Invoice;
use serde::Serialize;
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(remote = "repository::db_diesel::invoice_row::InvoiceType")]
pub enum InvoiceNodeType {
    OutboundShipment,
    InboundShipment,
    Prescription,
    InventoryAddition,
    InventoryReduction,
    SupplierReturn,
    CustomerReturn,
    Repack,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
#[graphql(remote = "repository::db_diesel::invoice_row::InvoiceStatus")]
pub enum InvoiceNodeStatus {
    /// Outbound Shipment: available_number_of_packs in a stock line gets
    /// updated when items are added to the invoice.
    /// Inbound Shipment: No stock changes in this status, only manually entered
    /// inbound Shipments have new status
    New,
    /// General description: Outbound Shipment is ready for picking (all unallocated lines need to be fullfilled)
    /// Outbound Shipment: Invoice can only be turned to allocated status when
    /// all unallocated lines are fullfilled
    /// Inbound Shipment: not applicable
    Allocated,
    /// General description: Outbound Shipment was picked from shelf and ready for Shipment
    /// Outbound Shipment: available_number_of_packs and
    /// total_number_of_packs get updated when items are added to the invoice
    /// Inbound Shipment: For inter store stock transfers an inbound Shipment
    /// is created when corresponding outbound Shipment is picked and ready for
    /// Shipment, inbound Shipment is not editable in this status
    Picked,
    /// General description: Outbound Shipment is sent out for delivery
    /// Outbound Shipment: Becomes not editable
    /// Inbound Shipment: For inter store stock transfers an inbound Shipment
    /// becomes editable when this status is set as a result of corresponding
    /// outbound Shipment being changed to shipped (this is similar to New status)
    Shipped,
    /// General description: Inbound Shipment was received
    /// Outbound Shipment: Status is updated based on corresponding inbound Shipment
    /// Inbound Shipment: Stock is introduced and can be issued
    Delivered,
    /// General description: Received inbound Shipment has arrived, not counted or verified yet
    /// Outbound Shipment: Status is updated based on corresponding inbound Shipment
    /// Inbound Shipment: Status update, doesn't affect stock levels or restrict access to edit
    Received,
    /// General description: Received inbound Shipment was counted and verified
    /// Outbound Shipment: Status is updated based on corresponding inbound Shipment
    /// Inbound Shipment: Becomes not editable
    Verified,
    // Cancelled only applies to Verified Transactions, they're treated like a customer return with a reverse transaction created to undo the original transaction in the ledger
    Cancelled,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterInvoiceTypeInput {
    pub equal_to: Option<InvoiceNodeType>,
    pub equal_any: Option<Vec<InvoiceNodeType>>,
    pub not_equal_to: Option<InvoiceNodeType>,
    pub not_equal_all: Option<Vec<InvoiceNodeType>>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterInvoiceStatusInput {
    pub equal_to: Option<InvoiceNodeStatus>,
    pub equal_any: Option<Vec<InvoiceNodeStatus>>,
    pub not_equal_to: Option<InvoiceNodeStatus>,
    pub not_equal_all: Option<Vec<InvoiceNodeStatus>>,
}

pub struct InvoiceNode {
    pub invoice: Invoice,
}

#[derive(SimpleObject)]
pub struct InvoiceConnector {
    total_count: u32,
    nodes: Vec<InvoiceNode>,
}

#[Object]
impl InvoiceNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn other_party_name(&self) -> &str {
        self.invoice.other_party_name()
    }

    pub async fn other_party_id(&self) -> &str {
        self.invoice.other_party_id()
    }

    /// User that last edited invoice, if user is not found in system default unknown user is returned
    /// Null is returned for transfers, where inbound has not been edited yet
    /// Null is also returned for system created invoices like inventory adjustments
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

    pub async fn r#type(&self) -> InvoiceNodeType {
        InvoiceNodeType::from(self.row().r#type.clone())
    }

    pub async fn status(&self) -> InvoiceNodeStatus {
        InvoiceNodeStatus::from(self.row().status.clone())
    }

    pub async fn invoice_number(&self) -> i64 {
        self.row().invoice_number
    }

    pub async fn their_reference(&self) -> &Option<String> {
        &self.row().their_reference
    }

    pub async fn transport_reference(&self) -> &Option<String> {
        &self.row().transport_reference
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn on_hold(&self) -> bool {
        self.row().on_hold
    }

    pub async fn is_cancellation(&self) -> bool {
        self.row().is_cancellation
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }

    pub async fn allocated_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .allocated_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn picked_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .picked_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn shipped_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .shipped_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn delivered_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .delivered_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn received_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .received_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn verified_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .verified_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn backdated_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .backdated_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn cancelled_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .cancelled_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    pub async fn colour(&self) -> &Option<String> {
        &self.row().colour
    }

    /// Response Requisition that is the origin of this Outbound Shipment
    /// Or Request Requisition for Inbound Shipment that Originated from Outbound Shipment (linked through Response Requisition)
    pub async fn requisition(&self, ctx: &Context<'_>) -> Result<Option<RequisitionNode>> {
        let requisition_id = if let Some(id) = &self.row().requisition_id {
            id
        } else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<RequisitionsByIdLoader>>();

        Ok(loader
            .load_one(requisition_id.clone())
            .await?
            .map(RequisitionNode::from_domain))
    }

    /// Inbound Shipment <-> Outbound Shipment, where Inbound Shipment originated from Outbound Shipment
    pub async fn linked_shipment(&self, ctx: &Context<'_>) -> Result<Option<InvoiceNode>> {
        let linked_invoice_id = if let Some(id) = &self.row().linked_invoice_id {
            id
        } else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<InvoiceByIdLoader>>();
        Ok(loader
            .load_one(linked_invoice_id.to_string())
            .await?
            .map(InvoiceNode::from_domain))
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<InvoiceLineConnector> {
        let loader = ctx.get_loader::<DataLoader<InvoiceLineByInvoiceIdLoader>>();
        let result_option = loader.load_one(self.row().id.to_string()).await?;

        Ok(InvoiceLineConnector::from_vec(
            result_option.unwrap_or(vec![]),
        ))
    }

    pub async fn pricing(&self, ctx: &Context<'_>) -> Result<PricingNode> {
        let loader = ctx.get_loader::<DataLoader<InvoiceStatsLoader>>();
        let default = PricingRow {
            invoice_id: self.row().id.clone(),
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            stock_total_before_tax: 0.0,
            stock_total_after_tax: 0.0,
            service_total_before_tax: 0.0,
            service_total_after_tax: 0.0,
            tax_percentage: self.row().tax_percentage,
            foreign_currency_total_after_tax: None,
        };

        let result_option = loader.load_one(self.row().id.to_string()).await?;

        Ok(PricingNode {
            invoice_pricing: result_option.unwrap_or(default),
        })
    }

    pub async fn tax_percentage(&self) -> &Option<f64> {
        &self.row().tax_percentage
    }

    pub async fn other_party(&self, ctx: &Context<'_>, store_id: String) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        let patient_loader = ctx.get_loader::<DataLoader<PatientLoader>>();

        let response_option = match loader
            .load_one(NameByIdLoaderInput::new(
                &store_id,
                &self.name_row().id.clone(),
            ))
            .await?
        {
            Some(name) => Some(name),
            // If name not found as other party, try to find it as patient
            None => patient_loader
                .load_one(self.name_row().id.clone())
                .await?
                .map(|name_row| {
                    let name_id = name_row.id.clone();
                    Name {
                        name_row,
                        name_link_row: NameLinkRow {
                            id: name_id.clone(),
                            name_id,
                        },
                        name_store_join_row: None,
                        store_row: None,
                        properties: None,
                    }
                }),
        };

        response_option.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name ({}) linked to invoice ({})",
                &self.name_row().id,
                &self.row().id
            ))
            .extend(),
        )
    }

    pub async fn clinician(&self) -> Option<ClinicianNode> {
        self.clinician_row()
            .as_ref()
            .map(|row| ClinicianNode::from_domain(row.clone()))
    }

    pub async fn clinician_id(&self) -> Option<String> {
        self.clinician_row()
            .as_ref()
            .map(|clinician| clinician.id.clone())
    }

    pub async fn patient(&self, ctx: &Context<'_>) -> Result<Option<PatientNode>> {
        let loader = ctx.get_loader::<DataLoader<PatientLoader>>();

        let result = loader
            .load_one(self.name_row().id.clone())
            .await?
            .map(|patient| PatientNode {
                store_id: self.row().store_id.clone(),
                allowed_ctx: vec![],
                patient,
            })
            .ok_or(Error::new(format!(
                "Failed to load patient: {}",
                self.name_row().id
            )))?;

        Ok(Some(result))
    }

    pub async fn currency(&self, ctx: &Context<'_>) -> Result<Option<CurrencyNode>> {
        let currency_id = match &self.row().currency_id {
            Some(currency_id) => currency_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<CurrencyByIdLoader>>();

        let result = loader
            .load_one(currency_id.clone())
            .await?
            .map(CurrencyNode::from_domain);

        Ok(result)
    }

    pub async fn currency_rate(&self) -> &f64 {
        &self.row().currency_rate
    }

    /// Inbound Shipment that is the origin of this Supplier Return
    /// OR Outbound Shipment that is the origin of this Customer Return
    pub async fn original_shipment(&self, ctx: &Context<'_>) -> Result<Option<InvoiceNode>> {
        let Some(original_shipment_id) = &self.row().original_shipment_id else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<InvoiceByIdLoader>>();
        Ok(loader
            .load_one(original_shipment_id.to_string())
            .await?
            .map(InvoiceNode::from_domain))
    }

    pub async fn diagnosis_id(&self) -> &Option<String> {
        &self.row().diagnosis_id
    }

    pub async fn diagnosis(&self, ctx: &Context<'_>) -> Result<Option<DiagnosisNode>> {
        let Some(diagnosis_id) = &self.row().diagnosis_id else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<DiagnosisLoader>>();
        Ok(loader
            .load_one(diagnosis_id.to_string())
            .await?
            .map(DiagnosisNode::from_domain))
    }

    pub async fn program_id(&self) -> &Option<String> {
        &self.row().program_id
    }

    pub async fn program(&self, ctx: &Context<'_>) -> Result<Option<ProgramNode>> {
        let Some(program_id) = self.row().program_id.clone() else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<ProgramByIdLoader>>();

        let result = loader
            .load_one(program_id)
            .await?
            .map(|program| ProgramNode {
                program_row: program,
            });

        Ok(result)
    }

    pub async fn store(&self) -> StoreNode {
        StoreNode::from_domain(Store {
            store_row: self.store_row().clone(),
            name_row: self.name_row().clone(),
        })
    }

    pub async fn name_insurance_join_id(&self) -> &Option<String> {
        &self.row().name_insurance_join_id
    }

    pub async fn insurance_policy(&self, ctx: &Context<'_>) -> Result<Option<InsurancePolicyNode>> {
        let Some(name_insurance_join_id) = &self.row().name_insurance_join_id else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<NameInsuranceJoinLoader>>();
        Ok(loader
            .load_one(name_insurance_join_id.to_string())
            .await?
            .map(InsurancePolicyNode::from_domain))
    }

    pub async fn insurance_discount_amount(&self) -> &Option<f64> {
        &self.row().insurance_discount_amount
    }

    pub async fn insurance_discount_percentage(&self) -> &Option<f64> {
        &self.row().insurance_discount_percentage
    }

    pub async fn expected_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().expected_delivery_date
    }

    pub async fn default_donor(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Option<NameNode>> {
        let donor_link_id = match &self.row().default_donor_link_id {
            None => return Ok(None),
            Some(donor_link_id) => donor_link_id,
        };
        let loader = ctx.get_loader::<DataLoader<NameByNameLinkIdLoader>>();
        let result = loader
            .load_one(NameByNameLinkIdLoaderInput::new(&store_id, donor_link_id))
            .await?;

        Ok(result.map(NameNode::from_domain))
    }

    pub async fn documents(&self, ctx: &Context<'_>) -> Result<SyncFileReferenceConnector> {
        let invoice_id = &self.row().id;
        let loader = ctx.get_loader::<DataLoader<SyncFileReferenceLoader>>();
        let result_option = loader.load_one(invoice_id.to_string()).await?;

        let documents = SyncFileReferenceConnector::from_vec(result_option.unwrap_or(vec![]));

        Ok(documents)
    }

    pub async fn shipping_method(&self, ctx: &Context<'_>) -> Result<Option<ShippingMethodNode>> {
        let shipping_method_id = match &self.row().shipping_method_id {
            Some(shipping_method_id) => shipping_method_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<ShippingMethodByIdLoader>>();

        let result = loader
            .load_one(shipping_method_id.clone())
            .await?
            .map(ShippingMethodNode::from_domain);

        Ok(result)
    }

    pub async fn purchase_order(&self, ctx: &Context<'_>) -> Result<Option<PurchaseOrderNode>> {
        // &self.row().purchase_order_id
        let Some(purchase_order_id) = &self.row().purchase_order_id else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<PurchaseOrderByIdLoader>>();
        Ok(loader
            .load_one(purchase_order_id.to_string())
            .await?
            .map(PurchaseOrderNode::from_domain))
    }
}

impl InvoiceNode {
    pub fn from_domain(invoice: Invoice) -> InvoiceNode {
        InvoiceNode { invoice }
    }
    pub fn row(&self) -> &InvoiceRow {
        &self.invoice.invoice_row
    }
    pub fn name_row(&self) -> &NameRow {
        &self.invoice.name_row
    }
    pub fn store_row(&self) -> &StoreRow {
        &self.invoice.store_row
    }
    pub fn clinician_row(&self) -> &Option<ClinicianRow> {
        &self.invoice.clinician_row
    }
}

// INVOICE LINE PRICING
pub struct PricingNode {
    pub invoice_pricing: PricingRow,
}

#[Object]
impl PricingNode {
    // total

    pub async fn total_before_tax(&self) -> f64 {
        self.invoice_pricing.total_before_tax
    }

    pub async fn total_after_tax(&self) -> f64 {
        self.invoice_pricing.total_after_tax
    }

    pub async fn foreign_currency_total_after_tax(&self) -> &Option<f64> {
        &self.invoice_pricing.foreign_currency_total_after_tax
    }

    // stock

    pub async fn stock_total_before_tax(&self) -> f64 {
        self.invoice_pricing.stock_total_before_tax
    }

    pub async fn stock_total_after_tax(&self) -> f64 {
        self.invoice_pricing.stock_total_after_tax
    }

    // service

    pub async fn service_total_before_tax(&self) -> f64 {
        self.invoice_pricing.service_total_before_tax
    }

    pub async fn service_total_after_tax(&self) -> f64 {
        self.invoice_pricing.service_total_after_tax
    }

    // tax

    pub async fn tax_percentage(&self) -> &Option<f64> {
        &self.invoice_pricing.tax_percentage
    }
}

impl InvoiceConnector {
    pub fn from_domain(invoices: ListResult<Invoice>) -> InvoiceConnector {
        InvoiceConnector {
            total_count: invoices.count,
            nodes: invoices
                .rows
                .into_iter()
                .map(InvoiceNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(invoices: Vec<Invoice>) -> InvoiceConnector {
        InvoiceConnector {
            total_count: usize_to_u32(invoices.len()),
            nodes: invoices.into_iter().map(InvoiceNode::from_domain).collect(),
        }
    }
}

#[cfg(test)]
mod test {

    use async_graphql::{EmptyMutation, Object};

    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test_with_data};
    use repository::{
        mock::{
            currency_a, mock_item_a, mock_item_b, mock_item_c, mock_name_a, mock_store_a, MockData,
            MockDataInserts,
        },
        Invoice, InvoiceLineRow, InvoiceLineType, InvoiceRow,
    };
    use serde_json::json;

    use crate::types::InvoiceNode;

    #[actix_rt::test]
    async fn graphq_test_invoice_pricing() {
        #[derive(Clone)]
        struct TestQuery;

        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "test_invoice_pricing".to_string(),
                name_link_id: mock_name_a().id,
                store_id: mock_store_a().id,
                currency_id: Some(currency_a().id),
                ..Default::default()
            }
        }
        fn line1() -> InvoiceLineRow {
            InvoiceLineRow {
                invoice_id: invoice().id,
                id: "line1_id".to_string(),
                item_link_id: mock_item_a().id,
                total_after_tax: 110.0,
                total_before_tax: 100.0,
                tax_percentage: Some(10.0),
                r#type: InvoiceLineType::Service,
                ..Default::default()
            }
        }
        fn line2() -> InvoiceLineRow {
            InvoiceLineRow {
                invoice_id: invoice().id,
                id: "line2_id".to_string(),
                item_link_id: mock_item_b().id,
                total_after_tax: 50.0,
                total_before_tax: 50.0,
                tax_percentage: None,
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }
        fn line3() -> InvoiceLineRow {
            InvoiceLineRow {
                invoice_id: invoice().id,
                id: "line3_id".to_string(),
                item_link_id: mock_item_c().id,
                total_after_tax: 105.0,
                total_before_tax: 100.0,
                tax_percentage: Some(5.0),
                r#type: InvoiceLineType::StockOut,
                ..Default::default()
            }
        }

        let (_, _, _, settings) = setup_graphql_test_with_data(
            TestQuery,
            EmptyMutation,
            "graphq_test_invoice_pricing",
            MockDataInserts::all(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![line1(), line2(), line3()],
                ..Default::default()
            },
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> InvoiceNode {
                InvoiceNode {
                    invoice: Invoice {
                        invoice_row: invoice(),
                        ..Default::default()
                    },
                }
            }
        }
        let total_before_tax = 50.0 + 100.0 + 100.0;
        let total_after_tax = 50.0 + 105.0 + 110.0;
        let tax_percentage_dec = (total_after_tax / total_before_tax) - 1.0;

        assert_eq!(
            total_before_tax * (1.0 + tax_percentage_dec),
            total_after_tax
        );
        let tax_percentage = tax_percentage_dec * 100.0;

        let expected = json!({
            "testQuery": {
                "pricing": {
                    "totalBeforeTax": total_before_tax,
                    "totalAfterTax": total_after_tax,
                    "stockTotalBeforeTax": 50.0 + 100.0,
                    "stockTotalAfterTax": 50.0 + 105.0,
                    "serviceTotalBeforeTax": 100.0,
                    "serviceTotalAfterTax": 110.0,
                    "taxPercentage": tax_percentage
                },
            }
        }
        );

        let query = r#"
        query {
            testQuery {
                pricing {
                    totalBeforeTax
                    totalAfterTax
                    stockTotalBeforeTax
                    stockTotalAfterTax
                    serviceTotalBeforeTax
                    serviceTotalAfterTax
                    taxPercentage  
                }
            }
        }
        "#;

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
