use strum::IntoEnumIterator;

use super::changelog::ChangelogTableName;

#[derive(strum::EnumIter, PartialEq, Eq, Debug, Clone, Copy)]
pub enum ChangeLogSyncStyle {
    Central, // Data created on Open-mSupply central server
    Remote,
    File,
    ToLegacyCentralOnly,
    Transfer,
    Patient,
    RemoteToCentral, // These records won't sync back to the remote site on re-initalisation
    /// One-way central->remote routing keyed by `changelog.store_id`. Pulls
    /// only when the requesting site has the row's store active and is not
    /// initialising. Push from remote is excluded entirely (rows can be
    /// created/edited locally but never propagate up). Used by `sync_request`.
    SyncRequest,
}

impl ChangeLogSyncStyle {
    pub(crate) fn get_table_names_for_sync_style(
        &self,
        sync_style_options: Option<SyncVersions>,
    ) -> Vec<ChangelogTableName> {
        ChangelogTableName::iter()
            .filter(|table| {
                let (styles, options) = table.sync_style();
                if let Some(sync_style_options) = &sync_style_options {
                    if sync_style_options != &options {
                        return false;
                    }
                }
                styles.iter().any(|style| style == self)
            })
            .collect()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SyncVersions {
    pub is_v6: bool,
    pub is_v5: bool,
}

// When adding a new change log record type, specify how it should be synced
// If new requirements are needed a different ChangeLogSyncStyle can be added
impl ChangelogTableName {
    pub fn sync_style(&self) -> (Vec<ChangeLogSyncStyle>, SyncVersions) {
        use ChangeLogSyncStyle::*;
        use ChangelogTableName::*;
        match self {
            // ----------------------------------------------------------
            // Legacy — Remote (not v6)
            // ----------------------------------------------------------
            ActivityLog | Clinician | ClinicianStoreJoin | IndicatorValue | InsuranceProvider
            | Location | LocationMovement | NameInsuranceJoin | NameStoreJoin | PurchaseOrder
            | PurchaseOrderLine | Sensor | StockLine | Stocktake | StocktakeLine
            | TemperatureBreach | TemperatureLog | VVMStatusLog => (
                vec![Remote],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Legacy — Remote + Central (hybrid, not v6)
            // Routes to a single owning site when the row carries a store_id,
            // otherwise fans out to every site.
            // ----------------------------------------------------------
            SyncMessage => (
                vec![Remote, Central],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Legacy — Remote + Transfer (not v6)
            // ----------------------------------------------------------
            Requisition | RequisitionLine => (
                vec![Remote, Transfer],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Legacy — Remote + Transfer + Patient (not v6)
            // ----------------------------------------------------------
            Invoice | InvoiceLine => (
                vec![Remote, Transfer, Patient],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Central (v6) — created on the Open-mSupply central server
            // ----------------------------------------------------------
            AssetCatalogueItem
            | AssetCatalogueType
            | AssetCategory
            | AssetClass
            | AssetLogReason
            | AssetProperty
            | BackendPlugin
            | BundledItem
            | Campaign
            | Demographic
            | FormSchema
            | FrontendPlugin
            | ItemVariant
            | NameOmsFields
            | NameProperty
            | PackagingVariant
            | Property
            | Report
            | VaccineCourse
            | VaccineCourseDose
            | VaccineCourseItem
            | VaccineCourseStoreConfig => (
                vec![Central],
                SyncVersions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // Central (not v6) — central data synced via legacy mSupply.
            // Also a catch-all bucket for tables not yet classified into a
            // more specific sync style.
            // ----------------------------------------------------------
            Abbreviation
            | Barcode
            | Category
            | Contact
            | ContactTrace
            | Context
            | Currency
            | DemographicIndicator
            | Diagnosis
            | DocumentRegistry
            | IndicatorColumn
            | IndicatorLine
            | Item
            | ItemCategoryJoin
            | ItemDirection
            | ItemStoreJoin
            | ItemWarningJoin
            | LocationType
            | MasterList
            | MasterListLine
            | MasterListNameJoin
            | NameTag
            | NameTagJoin
            | Period
            | PeriodSchedule
            | Printer
            | Program
            | ProgramEnrolment
            | ProgramEvent
            | ProgramIndicator
            | ProgramRequisitionOrderType
            | ProgramRequisitionSettings
            | ReasonOption
            | ShippingMethod
            | Store
            | StorePreference
            | Unit
            | UserAccount
            | UserPermission
            | UserStoreJoin
            | VVMStatus => (
                vec![Central],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // ToLegacyCentralOnly (not v6)
            // ----------------------------------------------------------
            Site => (
                vec![ToLegacyCentralOnly],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Remote (v6) — store-scoped data that syncs to the owning site
            // ----------------------------------------------------------
            Asset | AssetInternalLocation | AssetLog | RnrForm | RnrFormLine => (
                vec![Remote],
                SyncVersions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // Central + Patient (not v6) — central rows, plus patient rows routed to visible sites
            // ----------------------------------------------------------
            Name => (
                vec![Central, Patient],
                SyncVersions {
                    is_v6: true,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Remote + Patient (v6) — store-scoped data also routed to sites where the patient is visible
            // ----------------------------------------------------------
            Encounter | Vaccination => (
                vec![Remote, Patient],
                SyncVersions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // Patient (v6) — routed only to sites where the patient is visible
            // ----------------------------------------------------------
            Document => (
                vec![Patient],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // File (v6) — file references (handled by the file-sync pipeline)
            // ----------------------------------------------------------
            SyncFileReference => (
                vec![File],
                SyncVersions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // Remote + Central (v6) — Remote when store_id is set, otherwise Central
            // ----------------------------------------------------------
            PluginData | Preference => (
                vec![Remote, Central],
                SyncVersions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // RemoteToCentral (v6) — pushed to central but not synced back on re-init
            // ----------------------------------------------------------
            ContactForm | SystemLog => (
                vec![RemoteToCentral],
                SyncVersions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // SyncRequest — central->remote only, routed by store_id.
            // Excluded during initialisation; never pushed back from remote.
            // (Pattern and style share the variant name, so qualify both.)
            // ----------------------------------------------------------
            ChangelogTableName::SyncRequest => (
                vec![ChangeLogSyncStyle::SyncRequest, Central],
                SyncVersions {
                    is_v6: false,
                    is_v5: false,
                },
            ),
        }
    }
}
