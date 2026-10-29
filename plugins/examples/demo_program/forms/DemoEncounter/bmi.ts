/*
 * The body-mass index shown beside the vitals: a value derived in the form
 * and never stored, since the document already holds what it is made from.
 */
import { roundTo } from '@openmsupply/plugin-sdk';

/**
 * BMI from a weight in kilograms and a height in centimetres, to one decimal;
 * undefined until both are present and positive.
 */
export const bmi = (
  weightKg: number | undefined,
  heightCm: number | undefined
): number | undefined => {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return undefined;
  }
  const metres = heightCm / 100;
  return roundTo(weightKg / (metres * metres), 1);
};
