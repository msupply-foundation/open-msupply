import { For, Show } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { DetailCard } from '../ui/layout/Detail/DetailCard';
import { Stack } from '../ui/layout/Stack/Stack';
import { Text } from '../ui/elements/typography/Text';
import { Alert } from '../ui/elements/feedback/Alert';
import { Button } from '../ui/elements/buttons/Button';
import { StatusChip } from '../ui/elements/feedback/StatusChip';
import { ArrowRightIcon } from '../ui/icons';
import {
  prototypes,
  STATUS_COLOUR,
  STATUS_LABEL,
  type PrototypeDef,
} from './prototypes';

/*
 * The landing page for /prototypes/ — one card per prototype, carrying the
 * things a reviewer needs BEFORE opening one: what it shows, what it argues,
 * its status, and how it relates to what is already specified.
 *
 * Owns no CSS: it is assembled from ContentContainer / CardGrid / DetailCard /
 * Stack / Text / Alert / StatusChip. That is the point — the gallery that
 * presents proposals should itself be an example of composing the library.
 */

const PrototypeCard = (props: { prototype: PrototypeDef }) => {
  const p = () => props.prototype;
  const open = () => {
    window.location.hash = `#/prototypes/${p().id}`;
  };

  return (
    <DetailCard
      title={p().title}
      actions={
        <StatusChip
          label={STATUS_LABEL[p().status]}
          colour={STATUS_COLOUR[p().status]}
        />
      }
    >
      <Stack gap="md">
        <Text variant="body">{p().summary}</Text>

        <div>
          <Text variant="bodySmall" as="div">
            <b>Proposes</b>
          </Text>
          <Text variant="bodySmall" as="div">
            {p().proposes}
          </Text>
        </div>

        {/* A prototype that departs from a spec says so on its own card, so
            nobody mistakes a proposal for the plan of record. */}
        <Show when={p().relationToSpec}>
          {relation => (
            <Alert severity="warning">
              <b>Not the plan of record.</b> {relation()}
            </Alert>
          )}
        </Show>

        {/* The decisions being asked for. On the card rather than in someone's
            notes, so they travel with the proposal. */}
        <Show when={p().openQuestions?.length}>
          <div>
            <Text variant="bodySmall" as="div">
              <b>Open questions</b>
            </Text>
            <ul>
              <For each={p().openQuestions}>
                {question => (
                  <li>
                    <Text variant="bodySmall">{question}</Text>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>

        <div>
          <Button icon={<ArrowRightIcon />} onClick={open}>
            Open {p().title}
          </Button>
        </div>
      </Stack>
    </DetailCard>
  );
};

export const PrototypesIndex = () => (
  <ContentContainer size="wide" padded>
    <Stack gap="lg">
      <Stack gap="sm">
        <Text variant="heading" level={2}>
          Design prototypes
        </Text>
        <Text variant="body">
          Proposals built against the real component library, so an internal
          reviewer can use the thing rather than read about it. Each one is a
          working screen — but nothing here is wired to a backend, and nothing
          here is necessarily agreed.
        </Text>
      </Stack>

      <Alert severity="info">
        Separate from the <b>component showcase</b> on purpose. The showcase
        documents what the library <i>is</i> and should be citeable as
        reference; a prototype is an <i>unbuilt proposal</i>, sometimes one that
        diverges from a vertical&rsquo;s current spec. Read a card&rsquo;s
        status before quoting it.
      </Alert>

      <CardGrid minColumnWidth="24rem">
        <For each={prototypes}>
          {prototype => <PrototypeCard prototype={prototype} />}
        </For>
      </CardGrid>
    </Stack>
  </ContentContainer>
);
