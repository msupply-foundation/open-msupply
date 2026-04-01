/// Trait that each standard report implements to define its test behaviour.
/// Send + Sync required for parallel execution across tokio tasks.
pub trait ReportTest: Send + Sync {
    /// Report code (matches the directory name, e.g. "stock-status")
    fn code(&self) -> &str;

    /// Path to the report's latest directory relative to standard_reports/
    /// Default: "{code}/latest"
    fn path(&self) -> String {
        format!("{}/latest", self.code())
    }

    /// Whether to skip this report (e.g. needs DISPENSARY context)
    fn skip(&self) -> Option<&str> {
        None
    }

    /// Extra arguments to pass to show-report's test-config.
    /// Returns None to use the default test-config.json arguments.
    /// Override to provide report-specific filter values.
    fn arguments(&self) -> Option<serde_json::Value> {
        None
    }

    /// Validate the generated HTML output.
    /// Default implementation checks for <table>, no error strings, and expected_substrings().
    fn validate(&self, html: &str) -> Result<(), String> {
        if html.is_empty() {
            return Err("HTML output is empty".into());
        }

        if html.contains("FailedToFetchReportData") {
            return Err("HTML contains FailedToFetchReportData error".into());
        }

        if html.contains("error.no-permission-report") {
            return Err("HTML contains permission error".into());
        }

        if !html.contains("<table") && !html.contains("<TABLE") {
            return Err("HTML does not contain a <table> element".into());
        }

        for expected in self.expected_substrings() {
            if !html.contains(expected) {
                return Err(format!("HTML missing expected content: '{}'", expected));
            }
        }

        Ok(())
    }

    /// Substrings expected in the HTML output (typically column headers).
    /// Used by the default validate() implementation.
    fn expected_substrings(&self) -> Vec<&str> {
        vec![]
    }
}

// ── Report implementations ──────────────────────────────────────────

pub struct ExpiringItems;
impl ReportTest for ExpiringItems {
    fn code(&self) -> &str {
        "expiring-items"
    }
    fn arguments(&self) -> Option<serde_json::Value> {
        Some(serde_json::json!({
            "monthlyConsumptionLookBackPeriod": 3,
            "monthsOverstock": 6,
            "monthsUnderstock": 3,
            "monthsItemsExpire": 6,
            "timezone": "Pacific/Auckland"
        }))
    }
    fn expected_substrings(&self) -> Vec<&str> {
        vec!["Code", "Name", "Batch", "Expiry"]
    }
}

pub struct StockStatus;
impl ReportTest for StockStatus {
    fn code(&self) -> &str {
        "stock-status"
    }
    fn expected_substrings(&self) -> Vec<&str> {
        vec!["Code", "Name", "Status", "Consumption"]
    }
}

pub struct StockDetail;
impl ReportTest for StockDetail {
    fn code(&self) -> &str {
        "stock-detail"
    }
    fn expected_substrings(&self) -> Vec<&str> {
        vec!["Code", "Name", "Batch"]
    }
}

pub struct ItemList;
impl ReportTest for ItemList {
    fn code(&self) -> &str {
        "item-list"
    }
    fn expected_substrings(&self) -> Vec<&str> {
        vec!["Code", "Name"]
    }
}

pub struct ItemUsage;
impl ReportTest for ItemUsage {
    fn code(&self) -> &str {
        "item-usage"
    }
    fn expected_substrings(&self) -> Vec<&str> {
        vec!["Code", "Name", "Stock on hand"]
    }
}

pub struct InventoryAdjustments;
impl ReportTest for InventoryAdjustments {
    fn code(&self) -> &str {
        "inventory_adjustments"
    }
    fn expected_substrings(&self) -> Vec<&str> {
        vec!["Code", "Item name", "Batch"]
    }
}

pub struct OutboundShipments;
impl ReportTest for OutboundShipments {
    fn code(&self) -> &str {
        "outbound_shipments"
    }
    fn expected_substrings(&self) -> Vec<&str> {
        vec!["Customer", "Code", "Name", "Batch"]
    }
}

pub struct InboundShipments;
impl ReportTest for InboundShipments {
    fn code(&self) -> &str {
        "inbound_shipments"
    }
    fn expected_substrings(&self) -> Vec<&str> {
        vec!["Supplier", "Code", "Name", "Batch"]
    }
}

pub struct PendingEncounters;
impl ReportTest for PendingEncounters {
    fn code(&self) -> &str {
        "encounters"
    }
    fn skip(&self) -> Option<&str> {
        Some("DISPENSARY context — skipped")
    }
}

/// Register all standard reports to test.
/// Add new reports here.
pub fn all_reports() -> Vec<Box<dyn ReportTest>> {
    vec![
        Box::new(ExpiringItems),
        Box::new(InboundShipments),
        Box::new(InventoryAdjustments),
        Box::new(ItemList),
        Box::new(ItemUsage),
        Box::new(OutboundShipments),
        Box::new(StockDetail),
        Box::new(StockStatus),
        Box::new(PendingEncounters),
    ]
}
