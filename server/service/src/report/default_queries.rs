use super::definition::{DefaultQuery, GraphQlQuery};

pub fn get_default_gql_query(query: DefaultQuery) -> GraphQlQuery {
    match query {
        DefaultQuery::Invoice => GraphQlQuery {
            query: INVOICE_QUERY.to_string(),
            variables: None,
        },
        DefaultQuery::Stocktake => GraphQlQuery {
            query: STOCKTAKE_QUERY.to_string(),
            variables: None,
        },
        DefaultQuery::Requisition => GraphQlQuery {
            query: REQUISITION_QUERY.to_string(),
            variables: None,
        },
    }
}

const INVOICE_QUERY: &str = r#"
query InvoiceQuery($storeId: String, $dataId: String, $sort: PrintReportSortInput) {
  invoice(storeId: $storeId, id: $dataId) {
    ... on InvoiceNode {
      id
      allocatedDatetime
      colour
      comment
      createdDatetime
      deliveredDatetime
      invoiceNumber
      onHold
      otherPartyId
      otherPartyName
      pickedDatetime
      shippedDatetime
      status
      theirReference
      type
      verifiedDatetime
      pricing {
        serviceTotalAfterTax
        serviceTotalBeforeTax
        stockTotalAfterTax
        stockTotalBeforeTax
        taxPercentage
        totalAfterTax
        totalBeforeTax
        foreignCurrencyTotalAfterTax
      }
      otherParty(storeId: $storeId) {
        name
        isSupplier
        isCustomer
        id
        code
        address1
        address2
      }
      currency {
        id
        code
        rate
        isHomeCurrency
        dateUpdated
      }
      currencyRate
    }
  }
  invoiceLines(storeId: $storeId, invoiceId: $dataId, reportSort: $sort) {
    ... on InvoiceLineConnector {
      nodes {
        batch
        costPricePerPack
        expiryDate
        id
        invoiceId
        itemCode
        itemId
        itemName
        item {
          unitName
        }
        locationId
        locationName
        note
        numberOfPacks
        packSize
        sellPricePerPack
        taxPercentage
        totalAfterTax
        totalBeforeTax
        type
        pricing {
          serviceTotalAfterTax
          serviceTotalBeforeTax
          stockTotalAfterTax
          stockTotalBeforeTax
          taxPercentage
          totalAfterTax
          totalBeforeTax
          foreignCurrencyTotalAfterTax
        }
        stockLine {
          availableNumberOfPacks
          batch
          costPricePerPack
          expiryDate
          id
          itemId
          locationId
          locationName
          note
          onHold
          packSize
          sellPricePerPack
          storeId
          totalNumberOfPacks
        }
      }
    }
  }
  store(id: $storeId) {
    ... on StoreNode {
      id
      name(storeId: $storeId) {
        address1
        address2
        chargeCode
        code
        comment
        country
        email
        name
        phone
        website
      }
      code
      storeName
      logo
    }
    ... on NodeError {
      __typename
      error {
        description
      }
    }
  }
}
"#;

const STOCKTAKE_QUERY: &str = r#"query StocktakeQuery($storeId: String, $dataId: String, $sort: PrintReportSortInput) {
  stocktake(storeId: $storeId, id: $dataId) {
    ... on NodeError {
      __typename
      error {
        description
      }
    }
    ... on StocktakeNode {
      id
      storeId
      stocktakeNumber
      stocktakeDate
      status
      comment
      createdDatetime
      description
      finalisedDatetime
      inventoryAdjustmentId: inventoryAdditionId
      isLocked
      inventoryAdjustment: inventoryAddition {
        allocatedDatetime
        colour
        comment
        createdDatetime
        deliveredDatetime
        id
        invoiceNumber
        onHold
        otherPartyId
        otherPartyName
        pickedDatetime
        shippedDatetime
        status
        theirReference
        type
        verifiedDatetime
      }
    }
  }
  stocktakeLines(storeId: $storeId, stocktakeId: $dataId, reportSort: $sort) {
    ... on StocktakeLineConnector {
      nodes {
        batch
        comment
        costPricePerPack
        countedNumberOfPacks
        expiryDate
        id
        itemId
        note
        packSize
        sellPricePerPack
        snapshotNumberOfPacks
        stocktakeId
        item {
          name
          code
        }
        location {
          code
        }
      }
      totalCount
    }
  }
  store(id: $storeId) {
    ... on StoreNode {
      id
      name(storeId: $storeId) {
        address1
        address2
        chargeCode
        code
        comment
        country
        email
        name
        phone
        website
      }
      code
      storeName
      logo
    }
    ... on NodeError {
      __typename
      error {
        description
      }
    }
  }
}"#;

const REQUISITION_QUERY: &str = r#"query RequisitionQuery($storeId: String, $dataId: String) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      id
      colour
      comment
      createdDatetime
      finalisedDatetime
      maxMonthsOfStock
      minMonthsOfStock
      otherPartyId
      otherPartyName
      requisitionNumber
      sentDatetime
      status
      theirReference
      type
      shipments {
        totalCount
        nodes {
          allocatedDatetime
          colour
          comment
          createdDatetime
          deliveredDatetime
          id
          invoiceNumber
          onHold
          otherPartyId
          otherPartyName
          pickedDatetime
          shippedDatetime
          status
          theirReference
          type
          verifiedDatetime
        }
      }
      linkedRequisition {
        colour
        comment
        createdDatetime
        finalisedDatetime
        id
        maxMonthsOfStock
        minMonthsOfStock
        otherPartyId
        otherPartyName
        requisitionNumber
        sentDatetime
        status
        theirReference
        type
        lines {
          totalCount
        }
      }
      lines {
        nodes {
          comment
          id
          item {
            code
            name
          }
          itemName
          remainingQuantityToSupply
          suggestedQuantity
          requestedQuantity
          supplyQuantity
          itemStats {
            availableStockOnHand
            availableMonthsOfStockOnHand
            averageMonthlyConsumption
          }
        }
        totalCount
      }
      maxMonthsOfStock
    }
    ... on RecordNotFound {
      __typename
      description
    }
  }
  store(id: $storeId) {
    ... on StoreNode {
      id
      name(storeId: $storeId) {
        address1
        address2
        chargeCode
        code
        comment
        country
        email
        name
        phone
        website
      }
      code
      storeName
      logo
    }
    ... on NodeError {
      __typename
      error {
        description
      }
    }
  }
}"#;
