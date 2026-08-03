use strum::IntoEnumIterator;

use super::changelog::ChangelogTableName;

#[derive(Debug, Clone, PartialEq)]
pub struct SyncVersions {
    pub is_v6: bool,
    pub is_v5: bool,
}

// Authoring axis — what central accepts when validating an incoming push; a sanity check, not routing.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Authoring {
    Central,     // reject any remote push — central manages it
    Remote,      // store-scoped; owning store and central may edit
    RemoteOwned, // accept if store_id is active on the source site
    Transfer,    // cross-store; accept via the transfer-store id
    Patient,     // accept if patient_id present (store_id, if set, active on source)
    Anyone,      // accept as-is, no checks
    LegacyOnly,  // not a v7 record; reject
}

// Distribution axis — which sites central sends each row to; drives the changelog filters.
#[derive(Debug, Clone, Copy, PartialEq, Eq, strum::EnumIter)]
pub enum Distribution {
    Central,        // sent everywhere when keyless (store_id/patient_id null)
    Remote,         // owning store's site, every cycle
    RemoteOwned,    // owning store's site, init only
    Transfer,       // transfer store's site
    Patient,        // sites where the patient is visible (via name_store_join)
    NotDistributed, // never sent to a remote
}

// A table's sync style.
pub struct SyncStyle {
    pub authoring: Vec<Authoring>,
    pub distribution: Vec<Distribution>,
    pub transport: SyncVersions,
    pub multi_device_site: bool,
}

impl Distribution {
    pub(crate) fn get_table_names_for_distribution(
        &self,
        sync_style_options: Option<SyncVersions>,
    ) -> Vec<ChangelogTableName> {
        ChangelogTableName::iter()
            .filter(|table| {
                let SyncStyle {
                    distribution: distributions,
                    transport,
                    ..
                } = table.sync_style();
                if let Some(sync_style_options) = &sync_style_options {
                    if sync_style_options != &transport {
                        return false;
                    }
                }
                distributions
                    .iter()
                    .any(|distribution| distribution == self)
            })
            .collect()
    }
}

impl ChangelogTableName {
    pub fn sync_style(&self) -> SyncStyle {
        use Authoring::*;
        use ChangelogTableName::*;
        use Distribution as D;

        const V5: SyncVersions = SyncVersions {
            is_v6: false,
            is_v5: true,
        };
        const V6: SyncVersions = SyncVersions {
            is_v6: true,
            is_v5: false,
        };
        const V5_V6: SyncVersions = SyncVersions {
            is_v6: true,
            is_v5: true,
        };
        const V7_ONLY: SyncVersions = SyncVersions {
            is_v6: false,
            is_v5: false,
        };

        match self {
            NameStoreJoin => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: true,
            },
            ItemStoreJoin => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: false,
            },
            ClinicianStoreJoin => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: false,
            },

            ActivityLog => SyncStyle {
                authoring: vec![Remote],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: true,
            },
            IndicatorValue => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
                multi_device_site: false,
            },
            Location => SyncStyle {
                authoring: vec![Remote],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: true,
            },
            LocationMovement => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
                multi_device_site: false,
            },
            PurchaseOrder => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
                multi_device_site: false,
            },
            PurchaseOrderLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
                multi_device_site: false,
            },
            Sensor => SyncStyle {
                authoring: vec![Remote],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: true,
            },
            StockLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
                multi_device_site: false,
            },
            // OMS-native (no legacy 4D counterpart since the v2.21 stock-movement rewrite):
            // store-owned rows synced over v7 only.
            StockRelocation | StockRelocationLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V7_ONLY,
                multi_device_site: false,
            },
            Stocktake => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
                multi_device_site: false,
            },
            StocktakeLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
                multi_device_site: false,
            },
            TemperatureBreach => SyncStyle {
                authoring: vec![Remote],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: true,
            },
            TemperatureLog => SyncStyle {
                authoring: vec![Remote],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: true,
            },
            VVMStatusLog => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
                multi_device_site: false,
            },

            SyncMessage => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Central, D::Remote],
                transport: V5,
                multi_device_site: true,
            },

            Requisition => SyncStyle {
                authoring: vec![RemoteOwned, Transfer],
                distribution: vec![D::RemoteOwned, D::Transfer],
                transport: V5,
                multi_device_site: false,
            },
            RequisitionLine => SyncStyle {
                authoring: vec![RemoteOwned, Transfer],
                distribution: vec![D::RemoteOwned, D::Transfer],
                transport: V5,
                multi_device_site: false,
            },

            Invoice => SyncStyle {
                authoring: vec![RemoteOwned, Transfer, Patient],
                distribution: vec![D::RemoteOwned, D::Transfer, D::Patient],
                transport: V5,
                multi_device_site: false,
            },
            InvoiceLine => SyncStyle {
                authoring: vec![RemoteOwned, Transfer, Patient],
                distribution: vec![D::RemoteOwned, D::Transfer, D::Patient],
                transport: V5,
                multi_device_site: false,
            },
            CustomField | CustomFieldOption | CustomFieldScope => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V7_ONLY,
                // Multi-device sites sync `name` (which carries custom-field values in
                // `name.custom_fields`), so the definitions must reach them too — same
                // reasoning as Property/NameProperty.
                multi_device_site: true,
            },
            AncillaryItem => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            AssetCatalogueItem => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            AssetCatalogueType => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            AssetCategory => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            AssetClass => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            AssetLogReason => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            AssetProperty => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            BackendPlugin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            BundledItem => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            Campaign => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            Demographic => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            FormSchema => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            // Published front-end bundles. The record reaches every site; the site
            // decides locally whether it can run the bundle before downloading its
            // bytes (which travel as a sync_file_reference, not in this row).
            FrontendBundle => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V7_ONLY,
                multi_device_site: true,
            },
            FrontendPlugin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            HelpDocument => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            ItemVariant => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            NameOmsFields => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            NameProperty => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            PackagingVariant => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            Property => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            Report => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },
            VaccineCourse => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            VaccineCourseDose => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            VaccineCourseItem => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            VaccineCourseStoreConfig => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: false,
            },
            Abbreviation => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            Barcode => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            Category => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            Contact => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            Context => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            Currency => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            DemographicIndicator => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            Diagnosis => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            DocumentRegistry => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            IndicatorColumn => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            IndicatorLine => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            InsuranceProvider => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            Item => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            ItemCategoryJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            ItemDirection => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            ItemWarningJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            LocationType => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            MasterList => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            MasterListLine => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            MasterListNameJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            NameTag => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            NameTagJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            Period => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            PeriodSchedule => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            Printer => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            Program => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            ProgramIndicator => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            ProgramRequisitionOrderType => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            ProgramRequisitionSettings => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            ReasonOption => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            ShippingMethod => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            Store => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            StorePreference => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            Unit => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },
            UserAccount => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: true,
            },
            UserPermission => SyncStyle {
                authoring: vec![Remote],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: true,
            },
            UserStoreJoin => SyncStyle {
                authoring: vec![Remote],
                distribution: vec![D::Remote],
                transport: V5,
                multi_device_site: true,
            },
            VVMStatus => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },

            Clinician => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Central],
                transport: V5,
                multi_device_site: false,
            },

            Site => SyncStyle {
                authoring: vec![LegacyOnly],
                distribution: vec![D::NotDistributed],
                transport: V5,
                multi_device_site: false,
            },

            Asset => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V6,
                multi_device_site: true,
            },
            AssetInternalLocation => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V6,
                multi_device_site: true,
            },
            AssetLog => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V6,
                multi_device_site: true,
            },
            RnrForm => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V6,
                multi_device_site: false,
            },
            RnrFormLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V6,
                multi_device_site: false,
            },

            Name => SyncStyle {
                authoring: vec![Central, Patient],
                distribution: vec![D::Central, D::Patient],
                transport: V5_V6,
                multi_device_site: true,
            },

            Encounter => SyncStyle {
                authoring: vec![Remote, Patient],
                distribution: vec![D::Remote, D::Patient],
                transport: V6,
                multi_device_site: false,
            },
            Vaccination => SyncStyle {
                authoring: vec![Remote, Patient],
                distribution: vec![D::Remote, D::Patient],
                transport: V6,
                multi_device_site: false,
            },
            ContactTrace => SyncStyle {
                authoring: vec![Remote, Patient],
                distribution: vec![D::Remote, D::Patient],
                transport: V6,
                multi_device_site: false,
            },

            Document => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Patient],
                transport: V5,
                multi_device_site: false,
            },
            NameInsuranceJoin => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Patient],
                transport: V5,
                multi_device_site: false,
            },
            ProgramEnrolment => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Patient],
                transport: V5,
                multi_device_site: false,
            },
            ProgramEvent => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Patient],
                transport: V5,
                multi_device_site: false,
            },

            SyncFileReference => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Central],
                transport: V6,
                multi_device_site: true,
            },

            PluginData => SyncStyle {
                authoring: vec![Central, Remote],
                distribution: vec![D::Central, D::Remote],
                transport: V6,
                multi_device_site: true,
            },
            Preference => SyncStyle {
                authoring: vec![Central, Remote],
                distribution: vec![D::Central, D::Remote],
                transport: V6,
                multi_device_site: true,
            },

            ContactForm => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::NotDistributed],
                transport: V6,
                multi_device_site: false,
            },
            SystemLog => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::NotDistributed],
                transport: V6,
                multi_device_site: false,
            },

            // A table this site doesn't recognise (see `ChangelogTableName::Other`).
            // It has no real sync style: never distribute it to a remote, reject it as
            // a v7 authoring record, and mark it as belonging to neither v5 nor v6 so it
            // is excluded from every transport's distribution filter.
            Other(_) => SyncStyle {
                authoring: vec![LegacyOnly],
                distribution: vec![D::NotDistributed],
                transport: SyncVersions {
                    is_v5: false,
                    is_v6: false,
                },
                multi_device_site: false,
            },
        }
    }
}
