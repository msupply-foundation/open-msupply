import {
  create,
  RecordWithId,
  keyBy,
  mapValues,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from 'packages/invoices/src/types';

export enum AllocateIn {
  Packs = 'Packs',
  Units = 'Units',
  Doses = 'Doses',
}

interface AllocationContext {
  allocateIn: AllocateIn;
  setAllocateIn: (allocateIn: AllocateIn) => void;
  // TODO - is it performant? could do by id, then return array if needed?
  draftStockOutLines: DraftStockOutLine[];
  setDraftStockOutLines: (lines: DraftStockOutLine[]) => void;
}

export const useAllocationContext = create<AllocationContext>((set, get) => ({
  draftStockOutLines: [],
  allocatedQuantity: 0, // todo- getter only?
  allocateIn: AllocateIn.Packs, // TODO: from user pref? from store pref... also based on item?
  setAllocateIn: (allocateIn: AllocateIn) =>
    set(state => ({
      ...state,
      allocateIn,
      // Update allocated quan by in type
    })),
  setDraftStockOutLines: (lines: DraftStockOutLine[]) =>
    set(state => ({
      ...state,
      draftStockOutLines: lines,
    })),

  // confirmUnconfirmedLines: () => {
  //   const { baseLines, draftLines } = get();
  //   const toBeConfirmed = Object.values(baseLines).flatMap(baseLine => {
  //     const draftLine = draftLines[baseLine.id] || { id: baseLine.id };
  //     const line = { ...baseLine, ...draftLine };
  //     if (!line.confirmed)
  //       return [{ ...draftLine, confirmed: true, isDirty: true }];
  //     return [];
  //   });
  //   const toBeConfirmedById = keyBy(toBeConfirmed, 'id');
  //   set(state => ({
  //     ...state,
  //     draftLines: { ...state.draftLines, ...toBeConfirmedById },
  //     draftLineIteration: {
  //       ...state.draftLineIteration,
  //       ...mapValues(
  //         toBeConfirmedById,
  //         ({ id }) => (state.draftLineIteration[id] || 0) + 1
  //       ),
  //     },
  //   }));
  // },
}));

// SELECTOR HELPERS
// export const useCachedRnRDraftLine = (id: string) => {
//   const prevIteration = React.useRef(-1);
//   const prev = React.useRef<
//     | { line: RnRFormLineFragment & { isDirty?: boolean }; setLine: SetLine }
//     | undefined
//   >(undefined);

//   return (state: RnRFormContext) => {
//     const previousIteration = prevIteration.current;
//     prevIteration.current = state.draftLineIteration[id] ?? 0;

//     const baseLine = state.baseLines[id];
//     if (!baseLine) return undefined;

//     return previousIteration == (state.draftLineIteration[id] ?? 0)
//       ? prev.current
//       : (prev.current = {
//           line: { ...baseLine, ...(state.draftLines[id] || {}) },
//           setLine: state.setDraftLine,
//         });
//   };
// };
