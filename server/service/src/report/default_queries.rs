use super::definition::{DefaultQuery, GraphQlQuery};

pub fn get_default_gql_query(query: DefaultQuery) -> GraphQlQuery {
    match query {
        DefaultQuery::Invoice => GraphQlQuery {
            query: INVOICE_QUERY.to_string(),
            variables: None,
        },
    }
}

const INVOICE_QUERY: &str = r#"
query InvoiceQuery($storeId: String, $dataId: String) {
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
      }
      otherParty(storeId: "") {
        name
        isSupplier
        isCustomer
        id
        code
      }
      lines {
        nodes {
          batch
          costPricePerPack
          expiryDate
          invoiceId
          id
          itemCode
          itemId
          itemName
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
    ... on NodeError {
      __typename
      error {
        description
      }
    }
  }
}
"#;
