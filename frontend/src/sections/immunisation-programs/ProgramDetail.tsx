import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch, reportPermissionDenied } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_N } from '@/ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getNumberCell } from '@/ui/elements/table/tableHelpers';
import { createTableConfig } from '@/api/createTableConfig';
import { PlusCircleIcon } from '@/ui/icons';
import { hasPermission } from '@/store/storeContext';
import { useUrlQueryState } from '@/list/urlQueryState';
import { initialPageSize, rememberPageSize } from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import {
  ImmunisationProgram,
  VaccineCourseRows,
} from './immunisationPrograms.generated';
import {
  DEFAULT_COURSE_LIST_STATE,
  courseListVariables,
  demographicName,
  doseCount,
  inListOrder,
  type CourseListState,
  type CourseRow,
  type CourseSortKey,
} from './courseList';
import { CourseEditModal } from './CourseEditModal';
import { DeleteCoursesAction } from './DeleteCoursesAction';

// S2 — the program detail: its course list (spec/immunisation-programs
// ui-surface S2). A list screen under a two-crumb trail — Immunizations › the
// program's name — composed from library components, so the page owns no CSS:
// Page + Header(Breadcrumb / HeaderButtons) + DataTable (which owns its own
// toolbar, pager and selection action bar).
//
// A row opens the course editor (S3) on that course; New vaccine course and
// the empty state's create action open it blank; a selection offers Delete
// (S4). No action footer of its own: the screen is left by the breadcrumb
// (controls › footer button identity).

const EDIT_CENTRAL_DATA = 'EditCentralData';

const ProgramDetail: Component = () => {
  const params = useParams<{ storeId: string; programId: string }>();
  const { query, setQuery } = useUrlQueryState<CourseListState>({
    ...DEFAULT_COURSE_LIST_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The editor is one dialog for create and edit (S3): `undefined` = shut,
  // `null` = open blank (create), an id = open on that course (edit).
  const [editing, setEditing] = createSignal<string | null | undefined>(
    undefined
  );

  // The standing-capability mirror (rules § access; ui-standards validation §
  // permission gating): New vaccine course, the empty state's create action,
  // the editor's Save and Delete refuse UP FRONT for a user without the
  // central-data permission, with the same modal the server's own refusal
  // raises, and nothing is sent. Opening a course from its row is a read and
  // is not gated. The server stays the real guard.
  const guardEdit = (): boolean => {
    if (hasPermission('EDIT_CENTRAL_DATA')) return true;
    reportPermissionDenied([EDIT_CENTRAL_DATA]);
    return false;
  };

  const openCreate = () => {
    if (guardEdit()) setEditing(null);
  };
  const openEdit = (row: CourseRow) => setEditing(row.id);

  // Alt+N — this screen's add action (spec/keyboard KB-R2), declared once for
  // the two controls that trigger it: the header button and the empty state's
  // ghost button.
  createAddAction({ name: 'button.new-vaccine-course', run: openCreate });

  const tableConfig = createTableConfig({ tableId: 'vaccine-courses' });

  // The program's name for the breadcrumb (contract § the program detail) —
  // one read per program id. Read NON-SUSPENDING: the breadcrumb sits on a
  // screen that stays open while the editor dialog is up.
  const [program] = createResource(
    () => ({ storeId: params.storeId, id: params.programId }),
    async variables => {
      const result = await graphqlFetch(ImmunisationProgram, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.programs.nodes[0] ?? null;
    }
  );
  const programName = () => gated(program)?.name ?? '';

  const variables = createMemo(() =>
    courseListVariables(params.programId, query())
  );

  // The course list (kdd/state-management): codegen output through the single
  // never-throwing query method. The resource SOURCE is the serialised
  // variables. Read non-suspending below: the list refetches while the editor
  // or the delete confirmation — native <dialog>s — can be open, and a suspend
  // there would detach the dialog and lose its backdrop.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        VaccineCourseRows,
        JSON.parse(serialised) as ReturnType<typeof variables>
      );
      if (result.kind !== 'success') return undefined;
      return result.data.vaccineCourses;
    }
  );
  const list = () => gated(data);
  const rows = (): CourseRow[] => list()?.nodes ?? [];
  const totalCount = () => list()?.totalCount ?? 0;

  // A bulk delete of the last page's rows leaves the offset past the new end.
  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  const currentSort = (): SortState<CourseSortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Exactly ONE sort entry is ever recorded: the resolver applies the LAST
  // entry of the list it is sent (contract wire trap).
  const onSort = (key: CourseSortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  // A save closed the editor: the list reflects the change — that IS the
  // confirmation (controls › action feedback).
  const onSaved = () => {
    setEditing(undefined);
    void refetch();
  };

  // The delete run finished (every course, or stopped at a refusal): re-read
  // so the deleted rows leave. The selection is cleared when the delete
  // dialog CLOSES, not here — clearing it now would unmount the selection bar
  // the dialog lives in while its refusal notice is still being read.
  const onDeleteRun = () => void refetch();
  const onDeleteClosed = () => setSelectedIds([]);

  const columns = (): Column<CourseRow, CourseSortKey>[] => [
    {
      c: { key: 'name' },
      // The list's default sort and its ONLY sortable column.
      sortKey: 'name',
      header: () => t('label.name'),
      meta: { headerPosition: 'primary' },
    },
    {
      // The group's name; blank when the course has none (rules § the course).
      c: { accessor: demographicName, id: 'demographic' },
      header: () => t('label.target-demographic'),
    },
    {
      // The count of LIVE doses (rules § the program detail).
      c: { accessor: doseCount, id: 'doses' },
      header: () => t('label.doses'),
      ...getNumberCell(),
    },
  ];

  // Immunizations › the program's name (S2 § content). The parent crumb links
  // back to the list — how the screen is left.
  const crumbs = () => [
    {
      label: t('label.programs-immunisations'),
      to: `/${params.storeId}/programs/immunisations`,
    },
    { label: programName() },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Button
              icon={<PlusCircleIcon />}
              shortcut={ALT_N}
              data-testid="new-vaccine-course-button"
              onClick={openCreate}
            >
              {t('button.new-vaccine-course')}
            </Button>
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        // A row opens the editor on that course — a read, offered to everyone.
        onRowClick={openEdit}
        emptyMessage={t('error.no-vaccine-courses')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
            data-testid="nothing-here-create-button"
            onClick={openCreate}
          >
            {t('button.create-a-new-one')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        // The table's own footer swaps the pager for the selection bar (count +
        // Delete + Clear) while rows are selected.
        selectionActions={
          <DeleteCoursesAction
            // In list order: a run deletes in the order the rows are shown
            // (rules § deleting courses).
            orderedIds={() => inListOrder(selectedIds(), rows())}
            guardEdit={guardEdit}
            onRun={onDeleteRun}
            onClosed={onDeleteClosed}
          />
        }
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => {
            rememberPageSize(first);
            setQuery({ ...query(), first, offset: 0 });
          },
        }}
      />
      {/* Mounted only while open, so the dialog's ids exist exactly while it
          applies (e2e/TESTIDS.md) and a fresh draft is built per open. */}
      <Show when={editing() !== undefined}>
        <CourseEditModal
          storeId={params.storeId}
          programId={params.programId}
          courseId={editing() ?? undefined}
          guardEdit={guardEdit}
          onClose={() => setEditing(undefined)}
          onSaved={onSaved}
        />
      </Show>
    </Page>
  );
};

export default ProgramDetail;
