import { VaccinationDraft } from '../api';
import { VaccinationDetailFragment } from '../api/operations.generated';
import { getLabelKey, shouldShowSwitch } from './CreateTransactionsSwitch';
import { OTHER_FACILITY } from './FacilitySearchInput';

describe('shouldShowSwitch', () => {
  describe('no existing vaccination (create)', () => {
    it('should return true if the date is historical & doses configured', () => {
      const draft = { date: new Date('2021-01-01') } as VaccinationDraft;
      const hasDosesConfigured = true;
      expect(shouldShowSwitch(draft, hasDosesConfigured)).toBe(true);
    });

    it('should return false if no doses configured', () => {
      const draft = { date: new Date('2021-01-01') } as VaccinationDraft;
      const hasDosesConfigured = false;
      expect(shouldShowSwitch(draft, hasDosesConfigured)).toBe(false);
    });

    it('should return false if the date is not historical', () => {
      const draft = { date: new Date() } as VaccinationDraft;
      const hasDosesConfigured = true;
      expect(shouldShowSwitch(draft, hasDosesConfigured)).toBe(false);
    });
  });

  describe('existing vaccination with associated invoice (wanting to revert)', () => {
    const vaccination = { invoice: { id: 'id' } } as VaccinationDetailFragment;
    const hasDosesConfigured = true;
    it('should return true if facility is "other"', () => {
      const draft = {
        date: new Date(),
        facilityId: OTHER_FACILITY,
      } as VaccinationDraft;
      expect(shouldShowSwitch(draft, hasDosesConfigured, vaccination)).toBe(
        true
      );
    });

    it('should return true if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
      } as VaccinationDraft;
      expect(shouldShowSwitch(draft, hasDosesConfigured, vaccination)).toBe(
        true
      );
    });
  });

  describe('existing vaccination (wanting to create/update transactions)', () => {
    const vaccination = {
      stockLine: { id: 'id' },
    } as VaccinationDetailFragment;
    const hasDosesConfigured = true;

    it('should return false if stock line has not changed', () => {
      const draft = {
        date: new Date(),
        stockLine: { id: 'id' },
      } as VaccinationDraft;
      expect(shouldShowSwitch(draft, hasDosesConfigured, vaccination)).toBe(
        false
      );
    });

    it('should return false if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
      } as VaccinationDraft;
      expect(shouldShowSwitch(draft, hasDosesConfigured, vaccination)).toBe(
        false
      );
    });
    it('should return false if given is false & no stock line', () => {
      const draft = {
        date: new Date('2021-01-01'),
        given: false,
      } as VaccinationDraft;
      expect(
        shouldShowSwitch(
          draft,
          hasDosesConfigured,
          {} as VaccinationDetailFragment
        )
      ).toBe(false);
    });
    it('should return false if given is false', () => {
      const draft = {
        date: new Date(),
        given: false,
      } as VaccinationDraft;
      expect(shouldShowSwitch(draft, hasDosesConfigured, vaccination)).toBe(
        false
      );
    });

    it('should return false if facility is "other"', () => {
      const draft = {
        date: new Date(),
        facilityId: OTHER_FACILITY,
      } as VaccinationDraft;
      expect(shouldShowSwitch(draft, hasDosesConfigured, vaccination)).toBe(
        false
      );
    });

    it('should return false if no doses configured', () => {
      const draft = {
        date: new Date(),
        facilityId: 'my-facility',
        given: true,
        stockLine: { id: 'new' },
      } as VaccinationDraft;
      const hasDosesConfigured = false;
      expect(shouldShowSwitch(draft, hasDosesConfigured, vaccination)).toBe(
        true
      );
    });
    it('should return true if stock line has changed', () => {
      const draft = {
        date: new Date(),
        facilityId: 'my-facility',
        given: true,
        stockLine: { id: 'new' },
      } as VaccinationDraft;
      expect(shouldShowSwitch(draft, hasDosesConfigured, vaccination)).toBe(
        true
      );
    });
  });
});

describe('getLabelKey', () => {
  it('should return "record-stock-transaction" if the date is historical and no existing stock line', () => {
    const draft = { date: new Date('2021-01-01') } as VaccinationDraft;
    const vaccination = {} as VaccinationDetailFragment;
    expect(getLabelKey(draft, vaccination)).toBe(
      'label.record-stock-transaction'
    );
  });

  it('should return "revert-existing-transactions" if existing invoice and changing to other facility', () => {
    const draft = { facilityId: OTHER_FACILITY } as VaccinationDraft;
    const vaccination = { invoice: { id: 'id' } } as VaccinationDetailFragment;
    expect(getLabelKey(draft, vaccination)).toBe(
      'label.revert-existing-transaction'
    );
  });
  it('should return "revert-existing-transactions" if existing invoice and changing to not given', () => {
    const draft = { given: false } as VaccinationDraft;
    const vaccination = { invoice: { id: 'id' } } as VaccinationDetailFragment;
    expect(getLabelKey(draft, vaccination)).toBe(
      'label.revert-existing-transaction'
    );
  });

  it('should return "label.update-transactions" otherwise', () => {
    const draft = { date: new Date() } as VaccinationDraft;
    const vaccination = {} as VaccinationDetailFragment;
    expect(getLabelKey(draft, vaccination)).toBe('label.update-transactions');
  });
});
