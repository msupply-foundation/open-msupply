export const suggestedQuantity = (amc: number, soh: number, mos: number) => {
  // If there is no consumption, don't suggest any
  if (!amc) return 0;
  // If there is no months of stock to order to, don't suggest stock to be ordered
  if (!mos) return 0;

  // Total amount to potentially order
  const total = amc * mos;

  // Subtract the available stock on hand
  const suggested = total - soh;

  return suggested;
};
