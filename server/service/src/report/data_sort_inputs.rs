use repository::{StocktakeLineReportSort, StocktakeLineSortField};

/// This struct is used to sort stocktake lines in stocktake report
#[derive(Clone)]
pub struct DataSort {
    /// Key to sort by
    pub key: String,
    /// Whether to sort in descending order
    pub desc: Option<bool>,
}

impl DataSort {
    /// Convert DataSort to StocktakeLineReportSort domain struct
    pub fn to_stocktakeline_sort_domain(&self) -> StocktakeLineReportSort {
        match self.key.as_str() {
            "itemCode" => StocktakeLineReportSort {
                key: StocktakeLineSortField::ItemCode,
                desc: self.desc,
            },
            "itemName" => StocktakeLineReportSort {
                key: StocktakeLineSortField::ItemName,
                desc: self.desc,
            },
            "batch" => StocktakeLineReportSort {
                key: StocktakeLineSortField::Batch,
                desc: self.desc,
            },
            "expiryDate" => StocktakeLineReportSort {
                key: StocktakeLineSortField::ExpiryDate,
                desc: self.desc,
            },
            "packSize" => StocktakeLineReportSort {
                key: StocktakeLineSortField::PackSize,
                desc: self.desc,
            },
            "locationName" => StocktakeLineReportSort {
                key: StocktakeLineSortField::LocationName,
                desc: self.desc,
            },
            _ => StocktakeLineReportSort {
                key: StocktakeLineSortField::ItemName,
                desc: Some(false),
            },
        }
    }
}
