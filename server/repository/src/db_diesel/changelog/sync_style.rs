use strum::IntoEnumIterator;

use super::changelog::ChangelogTableName;

#[derive(strum::EnumIter, PartialEq, Eq, Debug, Clone, Copy)]
pub enum ChangeLogSyncStyle {
    Central,     // Data created on Open-mSupply central server
    Remote,      // Store-scoped; editable by the owning store and by central stores
    RemoteOwned, // Store-scoped; editable only by the owning store
    File,
    ToLegacyCentralOnly,
    Transfer,
    Patient,
    RemoteToCentral, // These records won't sync back to the remote site on re-initalisation
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
            NameStoreJoin | ItemStoreJoin | ClinicianStoreJoin => (
                vec![Remote],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Legacy — RemoteOwned (not v6)
            // ----------------------------------------------------------
            ActivityLog | IndicatorValue | Location | LocationMovement | PurchaseOrder
            | PurchaseOrderLine | Sensor | StockLine | Stocktake | StocktakeLine
            | TemperatureBreach | TemperatureLog | VVMStatusLog => (
                vec![RemoteOwned],
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
            // Legacy — RemoteOwned + Transfer (not v6)
            // ----------------------------------------------------------
            Requisition | RequisitionLine => (
                vec![RemoteOwned, Transfer],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Legacy — RemoteOwned + Transfer + Patient (not v6)
            // ----------------------------------------------------------
            Invoice | InvoiceLine => (
                vec![RemoteOwned, Transfer, Patient],
                SyncVersions {
                    is_v6: false,
                    is_v5: true,
                },
            ),
            // ----------------------------------------------------------
            // Central (v6) — created on the Open-mSupply central server
            // ----------------------------------------------------------
            AncillaryItem
            | AssetCatalogueItem
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
            // Central — v7 only. Properties v2 is a v7-era feature: it must
            // never be served over v6 (a v3.0 site can still run in V5V6
            // mode during transition). The {is_v6:false, is_v5:false} combo
            // is excluded by both the v5 and v6 changelog filters and only
            // included by the v7 pull (which passes no SyncVersions filter).
            // ----------------------------------------------------------
            CustomField | CustomFieldOption | CustomFieldTable => (
                vec![Central],
                SyncVersions {
                    is_v6: false,
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
            | Clinician
            | Contact
            | Context
            | Currency
            | DemographicIndicator
            | Diagnosis
            | DocumentRegistry
            | IndicatorColumn
            | IndicatorLine
            | InsuranceProvider
            | Item
            | ItemCategoryJoin
            | ItemDirection
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
            // Remote (v6)
            // ----------------------------------------------------------
            Asset | AssetInternalLocation => (
                vec![Remote],
                SyncVersions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // RemoteOwned (v6)
            // ----------------------------------------------------------
            AssetLog | RnrForm | RnrFormLine => (
                vec![RemoteOwned],
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
            Encounter | Vaccination | ContactTrace => (
                vec![Remote, Patient],
                SyncVersions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // Patient (v6) — routed only to sites where the patient is visible
            // ----------------------------------------------------------
            Document | NameInsuranceJoin | ProgramEnrolment | ProgramEvent => (
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
        }
    }
}
