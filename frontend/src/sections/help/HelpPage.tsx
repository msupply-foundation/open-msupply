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
// on any store/server, AC-V1): four blocks in order — user guide (external
// link), keyboard shortcuts (static text), help documents (one external link
// per showable document, hidden when none), and the contact form. Read-only
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

  // Contact form (AC-CF1–CF5).
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
      // AC-CF4: confirm + reset to AC-CF1 defaults (Send disabled again).
      setOutcome({ severity: 'success', text: t('messages.message-sent') });
      setReason('FEEDBACK');
      setEmail('');
      setMessage('');
    } else {
      // AC-CF5: failure in the form's own surface, draft preserved (D21/D22).
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
      {/* Block 1 — user guide (external link, opens a new context). */}
      <section>
        <Text variant="heading">{t('heading.user-guide')}</Text>
        <a
          href={userGuideUrl(locale())}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('label.user-guide')}
        </a>
      </section>

      {/* Block 2 — keyboard shortcuts (static explanatory text). */}
      <section>
        <Text variant="heading">{t('heading.keyboard-shortcuts')}</Text>
        <Text>{t('message.keyboard-shortcuts')}</Text>
      </section>

      {/* Block 3 — help documents; whole block absent when none showable (AC-V3). */}
      <Show when={documents().length > 0}>
        <section>
          <Text variant="heading">{t('heading.help-documents')}</Text>
          <For each={documents()}>
            {doc => (
              <div>
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
              </div>
            )}
          </For>
        </section>
      </Show>

      {/* Block 4 — contact form. */}
      <section>
        <Text variant="heading">{t('heading.contact-us')}</Text>
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
          onInput={setEmail}
          error={emailError()}
        />
        <TextArea
          label={t('label.message')}
          value={message()}
          onInput={setMessage}
          rows={4}
        />
        <Show when={outcome()}>
          {o => <Alert severity={o().severity}>{o().text}</Alert>}
        </Show>
        <Button
          icon={<MessageSquareIcon />}
          loading={sending()}
          disabled={!canSend()}
          onClick={() => void send()}
        >
          {t('button.send')}
        </Button>
      </section>
    </Page>
  );
};

export default HelpPage;
