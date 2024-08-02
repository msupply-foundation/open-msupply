export interface RepackDraft {
  stockLineId: string;
  packSize: number;
  newPackSize: number;
  numberOfPacks: number;
  newLocationId?: string;
  locationName?: string;
  newLocationName?: string;
}
