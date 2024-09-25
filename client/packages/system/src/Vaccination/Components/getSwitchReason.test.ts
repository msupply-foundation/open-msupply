import { VaccinationDraft } from '../api';
import { VaccinationDetailFragment } from '../api/operations.generated';
import { getSwitchReason } from './getSwitchReason';
import { OTHER_FACILITY } from './FacilitySearchInput';

describe('getSwitchReason', () => {
  describe('no existing vaccination (create)', () => {
    it('should return "record transaction" if the date is historical & doses configured', () => {
      const draft = {
        date: new Date('2021-01-01'),
        given: true,
      } as VaccinationDraft;
      const hasDosesConfigured = true;
      expect(getSwitchReason(draft, hasDosesConfigured)).toBe(
        'label.record-stock-transaction'
      );
    });

    it('should return null if no doses configured', () => {
      const draft = { date: new Date('2021-01-01') } as VaccinationDraft;
      const hasDosesConfigured = false;
      expect(getSwitchReason(draft, hasDosesConfigured)).toBeNull();
    });

    it('should return null if the date is not historical', () => {
      const draft = { date: new Date() } as VaccinationDraft;
      const hasDosesConfigured = true;
      expect(getSwitchReason(draft, hasDosesConfigured)).toBeNull();
    });
  });

  describe('existing vaccination with associated invoice (wanting to revert)', () => {
    const vaccination = { invoice: { id: 'id' } } as VaccinationDetailFragment;
    const hasDosesConfigured = true;
    it('should return "revert" if facility is "other"', () => {
      const draft = {
        date: new Date(),
        facilityId: OTHER_FACILITY,
      } as VaccinationDraft;
      expect(getSwitchReason(draft, hasDosesConfigured, vaccination)).toBe(
        'label.revert-existing-transaction'
      );
    });

    it('should return "revert" if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
      } as VaccinationDraft;
      expect(getSwitchReason(draft, hasDosesConfigured, vaccination)).toBe(
        'label.revert-existing-transaction'
      );
    });
  });

  describe('existing vaccination (wanting to create/update transactions)', () => {
    const vaccination = {
      stockLine: { id: 'id' },
    } as VaccinationDetailFragment;
    const hasDosesConfigured = true;

    it('should return null if stock line has not changed', () => {
      const draft = {
        date: new Date(),
        stockLine: { id: 'id' },
      } as VaccinationDraft;
      expect(
        getSwitchReason(draft, hasDosesConfigured, vaccination)
      ).toBeNull();
    });

    it('should return null if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
      } as VaccinationDraft;
      expect(
        getSwitchReason(draft, hasDosesConfigured, vaccination)
      ).toBeNull();
    });
    it('should return null if given is false & no stock line', () => {
      const draft = {
        date: new Date('2021-01-01'),
        given: false,
      } as VaccinationDraft;
      expect(
        getSwitchReason(
          draft,
          hasDosesConfigured,
          {} as VaccinationDetailFragment
        )
      ).toBeNull();
    });
    it('should return null if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
      } as VaccinationDraft;
      expect(
        getSwitchReason(draft, hasDosesConfigured, vaccination)
      ).toBeNull();
    });

    it('should return null if facility is "other"', () => {
      const draft = {
        date: new Date(),
        facilityId: OTHER_FACILITY,
      } as VaccinationDraft;
      expect(
        getSwitchReason(draft, hasDosesConfigured, vaccination)
      ).toBeNull();
    });

    it('should return null if no doses configured', () => {
      const draft = {
        date: new Date(),
        facilityId: 'my-facility',
        given: true,
        stockLine: { id: 'new' },
      } as VaccinationDraft;
      const hasDosesConfigured = false;
      expect(
        getSwitchReason(draft, hasDosesConfigured, vaccination)
      ).toBeNull();
    });
    it('should return "update" if stock line has changed', () => {
      const draft = {
        date: new Date(),
        facilityId: 'my-facility',
        given: true,
        stockLine: { id: 'new' },
      } as VaccinationDraft;
      expect(getSwitchReason(draft, hasDosesConfigured, vaccination)).toBe(
        'label.update-transactions'
      );
    });
  });
});
