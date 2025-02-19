module.exports = {
  processPrescription,
  roundValueTwoDp,
};

const processPrescription = (invoice) => {
  invoice.lines.nodes.forEach((invoiceLine) => {
    if (Object.keys(invoiceLine).length == 0) {
      return;
    }
    const roundedTotalBeforeTax = roundValueTwoDp(invoiceLine?.totalBeforeTax);
    if (!!roundedTotalBeforeTax) {
      invoiceLine.totalBeforeTax = roundedTotalBeforeTax;
    }
    console.log(roundedTotalBeforeTax);
  });
  const roundedTotalAfterTax = roundValueTwoDp(invoice?.pricing?.totalAfterTax);
  invoice.pricing.totalAfterTax = roundedTotalAfterTax;

  console.log(roundedTotalAfterTax);
  return invoice;
};

const roundValueTwoDp = (value) => {
  return (Math.round(value * 100) / 100).toFixed(2);
};
