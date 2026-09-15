import { VaccinationDraft } from '../api';
import { VaccinationDetailFragment } from '../api/operations.generated';
import { getSwitchReason } from './getSwitchReason';
import { OTHER_FACILITY } from './FacilitySearchInput';

describe('getSwitchReason', () => {
  describe('no existing vaccination (create)', () => {
    it('should return "record transaction" if the date is historical & item selected', () => {
      const draft = {
        date: new Date('2021-01-01'),
        given: true,
        itemId: 'id',
      } as VaccinationDraft;
      expect(getSwitchReason(draft)).toBe('label.record-stock-transaction');
    });

    it('should return null if no item selected', () => {
      const draft = {
        date: new Date('2021-01-01'),
        given: true,
      } as VaccinationDraft;
      expect(getSwitchReason(draft)).toBeNull();
    });

    it('should return null if the date is not historical', () => {
      const draft = {
        date: new Date(),
        given: true,
        itemId: 'id',
      } as VaccinationDraft;
      expect(getSwitchReason(draft)).toBeNull();
    });

    it('should return null if the facility is other', () => {
      const draft = {
        date: new Date('2021-01-01'),
        facilityId: OTHER_FACILITY,
        given: true,
        itemId: 'id',
      } as VaccinationDraft;
      expect(getSwitchReason(draft)).toBeNull();
    });
  });

  describe('existing vaccination with associated invoice (wanting to revert)', () => {
    const vaccination = { invoice: { id: 'id' } } as VaccinationDetailFragment;
    it('should return "revert" if facility is "other"', () => {
      const draft = {
        date: new Date(),
        facilityId: OTHER_FACILITY,
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBe(
        'label.revert-existing-transaction'
      );
    });

    it('should return "revert" if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBe(
        'label.revert-existing-transaction'
      );
    });

    it('should return "revert" if stock line has been un-selected', () => {
      const draft = {
        date: new Date(),
        given: true,
        stockLine: null,
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBe(
        'label.revert-existing-transaction'
      );
    });
  });

  describe('existing vaccination (wanting to create/update transactions)', () => {
    const vaccination = {
      stockLine: { id: 'id' },
    } as VaccinationDetailFragment;

    it('should return null if stock line has not changed', () => {
      const draft = {
        date: new Date(),
        stockLine: { id: 'id' },
        itemId: 'id',
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBeNull();
    });

    it('should return null if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
        itemId: 'id',
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBeNull();
    });
    it('should return null if given is false & no stock line', () => {
      const draft = {
        date: new Date('2021-01-01'),
        given: false,
        itemId: 'id',
      } as VaccinationDraft;
      expect(
        getSwitchReason(draft, {} as VaccinationDetailFragment)
      ).toBeNull();
    });
    it('should return null if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
        itemId: 'id',
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBeNull();
    });

    it('should return null if facility is "other"', () => {
      const draft = {
        date: new Date(),
        facilityId: OTHER_FACILITY,
        itemId: 'id',
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBeNull();
    });

    it('should return null if no item selected', () => {
      const draft = {
        date: new Date(),
        facilityId: 'my-facility',
        given: true,
        stockLine: { id: 'new' },
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBeNull();
    });
    it('should return "update" if stock line has changed', () => {
      const draft = {
        date: new Date(),
        facilityId: 'my-facility',
        given: true,
        stockLine: { id: 'new' },
        itemId: 'id',
      } as VaccinationDraft;
      expect(getSwitchReason(draft, vaccination)).toBe(
        'label.update-transactions'
      );
    });
  });
});
