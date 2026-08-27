import { useChangeLinesLocation } from './useChangeLinesLocation';
import { useStocktakeDeleteLines } from './useStocktakeDeleteLines';
import { useStocktakeDeleteSelectedLines } from './useStocktakeDeleteSelectedLines';
import { useStocktakeRows } from './useStocktakeRows';
import { useSaveStocktakeLines } from './useStocktakeSaveLines';
import { useZeroStocktakeLines } from './useZeroStocktakeLines';

export const Lines = {
  useStocktakeDeleteLines,
  useStocktakeDeleteSelectedLines,
  useStocktakeRows,
  useSaveStocktakeLines,
  useZeroStocktakeLines,
  useChangeLinesLocation,
};
