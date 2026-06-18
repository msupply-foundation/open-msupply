use strum::IntoEnumIterator;

use super::changelog::ChangelogTableName;

#[derive(Debug, Clone, PartialEq)]
pub struct SyncVersions {
    pub is_v6: bool,
    pub is_v5: bool,
}

// Authoring axis — what central accepts on a v7 push (drives validate_on_central).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Authoring {
    Central,     // reject any remote push — central manages it
    RemoteOwned, // accept if store_id is active on the source site
    Patient,     // accept if patient_id present (store_id, if set, active on source)
    Anyone,      // accept as-is, no checks
    LegacyOnly,  // not a v7 record; reject
}

// Distribution axis — who receives a row on pull-down (drives all_data_for_site + validate_on_remote)
#[derive(Debug, Clone, Copy, PartialEq, Eq, strum::EnumIter)]
pub enum Distribution {
    Everyone,       // sent everywhere when keyless (store_id/patient_id null)
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

        match self {
            NameStoreJoin => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V5,
            },
            ItemStoreJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Remote],
                transport: V5,
            },
            ClinicianStoreJoin => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V5,
            },

            ActivityLog => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::Remote],
                transport: V5,
            },
            IndicatorValue => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },
            Location => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },
            LocationMovement => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },
            PurchaseOrder => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },
            PurchaseOrderLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },
            Sensor => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::Remote],
                transport: V5,
            },
            StockLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },
            Stocktake => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },
            StocktakeLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },
            TemperatureBreach => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::Remote],
                transport: V5,
            },
            TemperatureLog => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::Remote],
                transport: V5,
            },
            VVMStatusLog => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V5,
            },

            SyncMessage => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Everyone, D::Remote],
                transport: V5,
            },

            Requisition => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned, D::Transfer],
                transport: V5,
            },
            RequisitionLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned, D::Transfer],
                transport: V5,
            },

            Invoice => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned, D::Transfer, D::Patient],
                transport: V5,
            },
            InvoiceLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned, D::Transfer, D::Patient],
                transport: V5,
            },

            AncillaryItem => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            AssetCatalogueItem => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            AssetCatalogueType => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            AssetCategory => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            AssetClass => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            AssetLogReason => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            AssetProperty => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            BackendPlugin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            BundledItem => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            Campaign => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            Demographic => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            FormSchema => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            FrontendPlugin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            ItemVariant => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            NameOmsFields => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            NameProperty => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            PackagingVariant => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            Property => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            Report => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            VaccineCourse => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            VaccineCourseDose => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            VaccineCourseItem => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },
            VaccineCourseStoreConfig => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V6,
            },

            // Also the catch-all for tables not yet classified into a more specific style.
            Abbreviation => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Barcode => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Category => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Contact => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Context => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Currency => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            DemographicIndicator => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Diagnosis => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            DocumentRegistry => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            IndicatorColumn => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            IndicatorLine => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            InsuranceProvider => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Item => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            ItemCategoryJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            ItemDirection => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            ItemWarningJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            LocationType => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            MasterList => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            MasterListLine => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            MasterListNameJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            NameTag => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            NameTagJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Period => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            PeriodSchedule => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Printer => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Program => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            ProgramIndicator => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            ProgramRequisitionOrderType => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            ProgramRequisitionSettings => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            ReasonOption => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            ShippingMethod => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Store => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            StorePreference => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            Unit => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            UserAccount => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            UserPermission => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Remote],
                transport: V5,
            },
            UserStoreJoin => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },
            VVMStatus => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone],
                transport: V5,
            },

            Clinician => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Everyone],
                transport: V5,
            },

            Site => SyncStyle {
                authoring: vec![LegacyOnly],
                distribution: vec![D::NotDistributed],
                transport: V5,
            },

            Asset => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V6,
            },
            AssetInternalLocation => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V6,
            },
            AssetLog => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Remote],
                transport: V6,
            },
            RnrForm => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V6,
            },
            RnrFormLine => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::RemoteOwned],
                transport: V6,
            },

            Name => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Everyone, D::Patient],
                transport: V5_V6,
            },

            Encounter => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::Remote, D::Patient],
                transport: V6,
            },
            Vaccination => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::Remote, D::Patient],
                transport: V6,
            },
            ContactTrace => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::Remote, D::Patient],
                transport: V6,
            },

            Document => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Patient],
                transport: V5,
            },
            NameInsuranceJoin => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Patient],
                transport: V5,
            },
            ProgramEnrolment => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Patient],
                transport: V5,
            },
            ProgramEvent => SyncStyle {
                authoring: vec![Patient],
                distribution: vec![D::Patient],
                transport: V5,
            },

            SyncFileReference => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::Everyone],
                transport: V6,
            },

            PluginData => SyncStyle {
                authoring: vec![RemoteOwned],
                distribution: vec![D::Everyone, D::Remote],
                transport: V6,
            },
            Preference => SyncStyle {
                authoring: vec![Central],
                distribution: vec![D::Everyone, D::Remote],
                transport: V6,
            },

            ContactForm => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::NotDistributed],
                transport: V6,
            },
            SystemLog => SyncStyle {
                authoring: vec![Anyone],
                distribution: vec![D::NotDistributed],
                transport: V6,
            },
        }
    }
}
