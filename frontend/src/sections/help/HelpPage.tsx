import {
  createResource,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../api/graphql';
import { locale, t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../../ui/layout/Stack/Stack';
import { FormSection } from '../../ui/layout/Form/FormSection';
import { Text } from '../../ui/elements/typography/Text';
import { Select } from '../../ui/elements/selectors/Select';
import { TextField } from '../../ui/elements/inputs/TextField';
import { TextArea } from '../../ui/elements/inputs/TextArea';
import { Button } from '../../ui/elements/buttons/Button';
import { Alert } from '../../ui/elements/feedback/Alert';
import { MessageSquareIcon } from '../../ui/icons';
import { HelpDocuments } from './helpDocuments.generated';
import { InsertContactForm } from './contactForm.generated';
import {
  canSendContactForm,
  helpDocumentFileUrl,
  isValidEmail,
  showableDocuments,
  userGuideUrl,
} from './helpLogic';

// S1 — the Help page (spec/help). Universal (identical for every signed-in user
// on any store/server, OMS-REG-HLP-01.15): four blocks in order — user guide
// (external link), keyboard shortcuts (static text), help documents (one
// external link per showable document, hidden when none), and the contact
// form. Read-only
// except the contact-form submit. File links + document view are same-origin
// `/sync_files/...` routes (session-cookie auth; served by the backend that
// bundles this app).

type ContactType = 'FEEDBACK' | 'SUPPORT';

const HelpPage: Component = () => {
  const params = useParams<{ storeId: string }>();

  // Help documents — server-wide, newest-first; only those with a file show.
  const [docsData] = createResource(async () => {
    const result = await graphqlFetch(HelpDocuments, {});
    if (result.kind !== 'success') return [];
    return result.data.helpDocuments.nodes;
  });
  const documents = () => showableDocuments(docsData.latest ?? []);

  // Contact form (OMS-REG-HLP-01.2-.9, .23-.27).
  const [reason, setReason] = createSignal<ContactType>('FEEDBACK');
  const [email, setEmail] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [sending, setSending] = createSignal(false);
  const [outcome, setOutcome] = createSignal<
    { severity: 'success' | 'error'; text: string } | undefined
  >();

  const emailError = () =>
    email().length > 0 && !isValidEmail(email())
      ? t('messages.error-not-valid-email')
      : undefined;
  const canSend = () => canSendContactForm(email(), message());

  const send = async () => {
    setSending(true);
    setOutcome(undefined);
    const result = await graphqlFetch(
      InsertContactForm,
      {
        storeId: params.storeId,
        input: {
          id: crypto.randomUUID(),
          contactType: reason(),
          replyEmail: email().trim(),
          body: message(),
        },
      },
      { returnGraphqlErrors: true }
    );
    setSending(false);
    if (result.kind === 'success') {
      // OMS-REG-HLP-01.8/.9/.25/.26: confirm + reset to the .2-.7 defaults
      // (Send disabled again).
      setOutcome({ severity: 'success', text: t('messages.message-sent') });
      setReason('FEEDBACK');
      setEmail('');
      setMessage('');
    } else {
      // OMS-REG-HLP-01.27: failure in the form's own surface, draft preserved (D21/D22).
      setOutcome({ severity: 'error', text: t('messages.message-not-sent') });
    }
  };

  return (
    <Page
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('help') }]} />
        </Header>
      }
    >
      {/* The spec's single width-capped column (spec/help S1 § layout): the
          registry's content measure at form width, blocks stacked with the
          page rhythm. */}
      <ContentContainer size="form">
        <Stack gap="lg">
          {/* Block 1 — user guide (external link, opens a new context). */}
          <FormSection title={t('heading.user-guide')}>
            <a
              href={userGuideUrl(locale())}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('label.user-guide')}
            </a>
          </FormSection>

          {/* Block 2 — keyboard shortcuts (static explanatory text). */}
          <FormSection title={t('heading.keyboard-shortcuts')}>
            <Text>{t('message.keyboard-shortcuts')}</Text>
          </FormSection>

          {/* Block 3 — help documents; whole block absent when none showable (OMS-REG-HLP-01.18/.19). */}
          <Show when={documents().length > 0}>
            <FormSection title={t('heading.help-documents')}>
              <For each={documents()}>
                {doc => (
                  <a
                    href={helpDocumentFileUrl(
                      '',
                      doc.id,
                      doc.files!.nodes[0]!.id
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {doc.title}
                  </a>
                )}
              </For>
            </FormSection>
          </Show>

          {/* Block 4 — contact form. */}
          <FormSection title={t('heading.contact-us')}>
            <Select
              label={t('label.reason-for-contacting')}
              value={reason()}
              options={[
                { value: 'FEEDBACK', label: t('label.feedback') },
                { value: 'SUPPORT', label: t('label.support') },
              ]}
              onValueChange={v => setReason(v as ContactType)}
            />
            <TextField
              label={t('label.your-email-address')}
              value={email()}
              onInput={e => setEmail(e.currentTarget.value)}
              error={emailError()}
            />
            <TextArea
              label={t('label.message')}
              value={message()}
              onInput={e => setMessage(e.currentTarget.value)}
              rows={4}
            />
            <Show when={outcome()}>
              {o => <Alert severity={o().severity}>{o().text}</Alert>}
            </Show>
            {/* Natural-width button (a bare flex child would stretch). The
                spec's end-alignment awaits a form-actions layout primitive. */}
            <div>
              <Button
                icon={<MessageSquareIcon />}
                loading={sending()}
                disabled={!canSend()}
                onClick={() => void send()}
              >
                {t('button.send')}
              </Button>
            </div>
          </FormSection>
        </Stack>
      </ContentContainer>
    </Page>
  );
};

export default HelpPage;
