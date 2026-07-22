import { createSignal } from 'solid-js';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { Tabs, TabList, TabPanel } from '../ui/elements/tabs/Tabs';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { IdentityHeader } from '../ui/layout/IdentityHeader/IdentityHeader';
import { FormColumns } from '../ui/layout/Form/FormColumns';
import { FormColumn } from '../ui/layout/Form/FormColumn';
import { FormSection } from '../ui/layout/Form/FormSection';
import { FormRow } from '../ui/layout/Form/FormRow';
import { TextField } from '../ui/elements/inputs/TextField';
import { DateField } from '../ui/elements/inputs/DateField';
import { CurrencyField } from '../ui/elements/inputs/CurrencyField';
import { Checkbox } from '../ui/elements/inputs/Checkbox';
import { Select } from '../ui/elements/selectors/Select';
import { LabelledValue } from '../ui/elements/typography/LabelledValue';
import { EmptyState } from '../ui/elements/feedback/EmptyState';
import { Alert } from '../ui/elements/feedback/Alert';
import { ContentFooter } from '../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../ui/elements/buttons/Button';
import { CopyIcon, PlusCircleIcon, SaveIcon, XCircleIcon } from '../ui/icons';

const LOCATIONS = [
  { value: 's4', label: 'S4 – S4 (Ambient)' },
  { value: 's1', label: 'S1 – S1 (Cold room)' },
  { value: 's2', label: 'S2 – S2 (Ambient)' },
];
const MANUFACTURERS = [
  { value: 'acme', label: 'Acme Pharma' },
  { value: 'medicorp', label: 'MediCorp' },
];
const DONORS = [
  { value: 'unicef', label: 'UNICEF' },
  { value: 'who', label: 'WHO' },
  { value: 'gf', label: 'Global Fund' },
];
const CAMPAIGNS = [
  { value: 'measles', label: 'Measles 2026' },
  { value: 'polio', label: 'Polio round 2' },
];

/*
 * Pages › Detail form: the whole stock detail form, the way a real vertical
 * assembles it from the form-layout vocabulary (kdd/form-layout). The
 * element-by-element anatomy — including the nesting tree — lives on the
 * Layout Elements › Form layout page (FormLayoutShowcase.tsx,
 * #/showcase/form-layout); this page is the assembled result, deliberately
 * free of explanatory chrome. Keep that page's ANATOMY tree in step when the
 * assembly here changes.
 *
 * Every control is a standard src/ui input — the layout adds arrangement only,
 * never styling. Editable fields are inputs; read-only facts are LabelledValue
 * (label-above-value, no input chrome). Resize the panel to watch the two
 * columns collapse to one, then the two-up FormRows stack.
 */
export const FormsShowcase = () => {
  const [tab, setTab] = createSignal('details');

  const [batch, setBatch] = createSignal('B2467-594');
  const [barcode, setBarcode] = createSignal('');
  const [expiry, setExpiry] = createSignal<string | null>('2028-10-01');
  const [manufactured, setManufactured] = createSignal<string | null>(null);
  const [cost, setCost] = createSignal<number | undefined>(0.61);
  const [sell, setSell] = createSignal<number | undefined>(1.0);
  const [location, setLocation] = createSignal('s4');
  const [onHold, setOnHold] = createSignal(false);
  const [manufacturer, setManufacturer] = createSignal('');
  const [donor, setDonor] = createSignal('unicef');
  const [campaign, setCampaign] = createSignal('');

  return (
    <Tabs value={tab()} onValueChange={setTab}>
      <Page
        header={
          <Header>
            <Breadcrumb
              crumbs={[
                { label: 'Stock' },
                { label: 'Acetylsalicylic Acid 300mg Tablet' },
              ]}
            />
            <HeaderButtons>
              <Button variant="secondary" icon={<CopyIcon />}>
                Repack
              </Button>
              <Button variant="secondary" icon={<PlusCircleIcon />}>
                Adjust
              </Button>
            </HeaderButtons>
            <TabList
              tabs={[
                { value: 'details', label: 'Details' },
                { value: 'log', label: 'Log' },
                { value: 'ledger', label: 'Ledger' },
              ]}
            />
          </Header>
        }
        contentFooter={
          <ContentFooter>
            <ContentFooterActions>
              <Button variant="secondary" icon={<XCircleIcon />}>
                Cancel
              </Button>
              <Button variant="secondary" icon={<SaveIcon />}>
                Save
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        }
      >
        <TabPanel value="details">
          <ContentContainer size="form">
            <Stack>
              <IdentityHeader
                title="Acetylsalicylic Acid 300mg Tablet"
                subtitle="Code: 030453 · Unit: tablet"
              />
              <FormColumns>
                <FormColumn>
                  <FormSection title="Stock Levels">
                    <FormRow>
                      <LabelledValue variant="field" label="Pack qty">
                        580
                      </LabelledValue>
                      <LabelledValue variant="field" label="Available packs">
                        530
                      </LabelledValue>
                    </FormRow>
                    <FormRow>
                      <LabelledValue variant="field" label="Available stock">
                        53,000 tablets
                      </LabelledValue>
                      <LabelledValue variant="field" label="Stock on hand">
                        58,000 tablets
                      </LabelledValue>
                    </FormRow>
                  </FormSection>

                  <FormSection title="Batch & Dates">
                    <TextField
                      label="Batch number"
                      width="full"
                      value={batch()}
                      onInput={e => setBatch(e.currentTarget.value)}
                    />
                    <TextField
                      label="Barcode"
                      width="full"
                      placeholder="Scan or enter barcode"
                      value={barcode()}
                      onInput={e => setBarcode(e.currentTarget.value)}
                    />
                    <FormRow>
                      <DateField
                        label="Expiry date"
                        width="full"
                        format="dd/MM/yyyy"
                        value={expiry()}
                        onChange={setExpiry}
                      />
                      <DateField
                        label="Manufacture date"
                        width="full"
                        format="dd/MM/yyyy"
                        value={manufactured()}
                        onChange={setManufactured}
                      />
                    </FormRow>
                  </FormSection>

                  <FormSection title="Pricing">
                    <FormRow>
                      <CurrencyField
                        label="Cost price"
                        currency="USD"
                        value={cost()}
                        onChange={setCost}
                      />
                      <CurrencyField
                        label="Sell price"
                        currency="USD"
                        value={sell()}
                        onChange={setSell}
                      />
                    </FormRow>
                  </FormSection>
                </FormColumn>

                <FormColumn>
                  <FormSection title="Storage & Pack">
                    <Select
                      label="Location"
                      options={LOCATIONS}
                      value={location()}
                      onValueChange={setLocation}
                    />
                    <FormRow>
                      <LabelledValue variant="field" label="Pack size">
                        100
                      </LabelledValue>
                      <Checkbox
                        label="On hold"
                        checked={onHold()}
                        onChange={setOnHold}
                      />
                    </FormRow>
                    <FormRow>
                      <LabelledValue
                        variant="field"
                        label="Volume per pack (m³)"
                      >
                        0.00036
                      </LabelledValue>
                      <LabelledValue variant="field" label="Total volume">
                        0.2088
                      </LabelledValue>
                    </FormRow>
                  </FormSection>

                  <FormSection title="Supply Chain">
                    <Select
                      label="Manufacturer"
                      options={MANUFACTURERS}
                      value={manufacturer()}
                      placeholder="Select a manufacturer"
                      onValueChange={setManufacturer}
                    />
                    <LabelledValue variant="field" label="Supplier">
                      —
                    </LabelledValue>

                    <FormSection
                      headingLevel="h3"
                      title="Inventory adjustments"
                    >
                      <FormRow>
                        <Select
                          label="Donor"
                          options={DONORS}
                          value={donor()}
                          onValueChange={setDonor}
                        />
                        <Select
                          label="Campaign / program"
                          options={CAMPAIGNS}
                          value={campaign()}
                          placeholder="None"
                          onValueChange={setCampaign}
                        />
                      </FormRow>
                    </FormSection>
                  </FormSection>
                </FormColumn>
              </FormColumns>
              <Alert severity="info">
                See the anatomy of this page on the{' '}
                <a href="#/showcase/form-layout">"Form layout" page</a>.
              </Alert>
            </Stack>
          </ContentContainer>
        </TabPanel>

        <TabPanel value="log">
          <EmptyState message="Activity log would appear here." />
        </TabPanel>
        <TabPanel value="ledger">
          <EmptyState message="Stock ledger would appear here." />
        </TabPanel>
      </Page>
    </Tabs>
  );
};
