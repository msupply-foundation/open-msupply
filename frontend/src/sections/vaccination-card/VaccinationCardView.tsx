import { createResource, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { localisedDate } from '@/intl/formatDateTime';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderToolbar } from '@/ui/layout/Header/HeaderToolbar';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { localTodayIso } from '@/ui/elements/inputs/dateTimeConvert';
import { fetchCard, fetchCardPatient } from './cardApi';
import { cardCounts, patientAgeLabel } from './cardModel';
import {
  VaccinationCardNotices,
  VaccinationCardTable,
} from './VaccinationCardTable';

/*
 * S1 — the vaccination card from the patient (spec/vaccination-card
 * ui-surface § S1): reached from a row of the patient's Vaccinations tab,
 * read-only. Its header states the patient's age, date of birth and doses
 * given, and the card's notices (rules § the card at a glance).
 *
 * Both reads first fetch on the screen's own load and refetch on nothing the
 * user does here, read non-suspending all the same (gated).
 */
const VaccinationCardView: Component = () => {
  const params = useParams<{
    storeId: string;
    patientId: string;
    programEnrolmentId: string;
  }>();
  const navigate = useNavigate();

  const [cardData] = createResource(
    () => ({
      storeId: params.storeId,
      programEnrolmentId: params.programEnrolmentId,
    }),
    fetchCard
  );
  const [patientData] = createResource(
    () => ({ storeId: params.storeId, patientId: params.patientId }),
    fetchCardPatient
  );

  const card = () => gated(cardData);
  const rows = () => card()?.rows ?? [];
  const patient = () => gated(patientData)?.patient ?? undefined;
  const dateOfBirth = () => patient()?.dateOfBirth ?? null;

  // Every crumb but the leaf navigates (ui-surface § S1): the patient's name
  // to their Details, "Vaccination card" to their Vaccinations tab — the list
  // of their cards. The program's name is the page heading; an unknown
  // enrolment has none, so the trail ends at "Vaccination card" rather than an
  // empty crumb (the leaf, which never navigates).
  const patientPath = () =>
    `/${params.storeId}/dispensary/patients/${params.patientId}`;
  const crumbs = () =>
    [
      {
        label: t('label.patients'),
        onClick: () => navigate(`/${params.storeId}/dispensary/patients`),
      },
      {
        label: patient()?.name ?? '',
        onClick: () => navigate(patientPath()),
      },
      {
        label: t('label.vaccination-card'),
        onClick: () => navigate(`${patientPath()}?tab=vaccinations`),
      },
      { label: card()?.programName ?? '' },
    ].filter(crumb => crumb.label !== '');

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderToolbar alert={<VaccinationCardNotices rows={rows()} />}>
            <LabelledValue
              label={t('label.age')}
              size="small"
              data-testid="vaccination-card-age"
            >
              {/* An absent value beside a label shows a dash
                  (ui-standards › detail views). */}
              <Show when={dateOfBirth()} fallback="—">
                {dob => patientAgeLabel(dob(), localTodayIso())}
              </Show>
            </LabelledValue>
            <LabelledValue
              label={t('label.date-of-birth')}
              size="small"
              data-testid="vaccination-card-date-of-birth"
            >
              <Show when={dateOfBirth()} fallback="—">
                {dob => localisedDate(dob())}
              </Show>
            </LabelledValue>
            <LabelledValue
              label={t('label.doses-given')}
              size="small"
              data-testid="vaccination-card-doses-given"
            >
              {t('label.doses-given-of', {
                given: cardCounts(rows()).given,
                total: cardCounts(rows()).total,
              })}
            </LabelledValue>
          </HeaderToolbar>
        </Header>
      }
    >
      <VaccinationCardTable
        rows={rows()}
        reasons={card()?.reasons ?? {}}
        loading={cardData.loading}
        hasDateOfBirth={dateOfBirth() !== null}
        notices={false}
      />
    </Page>
  );
};

export default VaccinationCardView;
