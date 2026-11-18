import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CentralDataImport,
  CentralDataImportPreview,
} from './centralData.generated';

/*
 * The page's wiring (spec/central-data/ui-surface.md § S1). No e2e suite
 * reaches it: the e2e stack isn't a standalone central. Library components
 * are stand-ins that record their props; ImportCard, its createImport and
 * centralDataLogic are real, so the import is driven through the page.
 */

interface UploadZoneProps {
  loading?: boolean;
  onPick: (
    accepted: File[],
    rejected: { file: File; reason: 'type' | 'size' }[]
  ) => void;
}
interface AlertProps {
  testId?: string;
  children: unknown;
}
interface PreviewCardProps {
  preview: { fileId: string; fileName: string; summary: unknown };
}
interface PreviewFooterProps extends PreviewCardProps {
  busy: boolean;
  onConfirm: () => void;
  onDownloadErrors: () => void;
}
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  'data-testid'?: string;
  children: unknown;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
}
interface ExportCardProps {
  filters: { ticked: boolean }[];
  setFilters: (index: number, key: 'ticked', value: boolean) => void;
}

const shown: {
  page?: { header: unknown; children: unknown; contentFooter: unknown };
  tabs?: TabsProps;
  tabList?: { tabs: { value: string }[] };
  exportCard?: ExportCardProps;
  zone?: UploadZoneProps;
  alerts: AlertProps[];
  buttons: Record<string, ButtonProps>;
  texts: unknown[];
  previewCard?: PreviewCardProps;
  footer?: PreviewFooterProps;
} = { alerts: [], buttons: {}, texts: [] };

// Reads a JSX child the stand-ins returned, so conditional content renders.
const resolve = (value: unknown): unknown =>
  typeof value === 'function'
    ? resolve((value as () => unknown)())
    : Array.isArray(value)
      ? value.map(resolve)
      : value;

// The address's search params, as the router's hook hands them out.
const searchParams: { tab?: string } = {};
vi.mock('@solidjs/router', () => ({
  useSearchParams: () => [
    searchParams,
    (next: { tab?: string }) => Object.assign(searchParams, next),
  ],
}));
vi.mock('@/ui/elements/tabs/Tabs', () => ({
  Tabs: (p: TabsProps & { children: unknown }) => {
    shown.tabs = p;
    return p.children;
  },
  TabList: (p: { tabs: { value: string }[] }) => {
    shown.tabList = p;
    return 'tabs';
  },
  // Only the open tab's panel is mounted, as Kobalte does.
  TabPanel: (p: { value: string; children: unknown }) =>
    shown.tabs?.value === p.value ? p.children : '',
}));
vi.mock('@/ui/layout/Page/Page', () => ({
  Page: (p: { header: unknown; children: unknown; contentFooter: unknown }) => {
    shown.page = p;
    return 'page';
  },
}));
vi.mock('@/ui/layout/Header/Header', () => ({
  Header: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/layout/Header/Breadcrumb', () => ({ Breadcrumb: () => '' }));
vi.mock('@/ui/layout/ContentContainer/ContentContainer', () => ({
  ContentContainer: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/layout/Detail/DetailCard', () => ({
  DetailCard: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/layout/Stack/Stack', () => ({
  Stack: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/layout/Stack/HStack', () => ({
  HStack: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/elements/buttons/Button', () => ({
  Button: (p: ButtonProps) => {
    if (p['data-testid']) shown.buttons[p['data-testid']] = p;
    return 'button';
  },
}));
vi.mock('@/ui/elements/typography/Text', () => ({
  Text: (p: { children: unknown }) => {
    shown.texts.push(p.children);
    return p.children;
  },
}));
vi.mock('@/ui/elements/inputs/UploadZone', () => ({
  UploadZone: (p: UploadZoneProps) => {
    shown.zone = p;
    return 'zone';
  },
}));
vi.mock('@/ui/elements/feedback/Alert', () => ({
  Alert: (p: AlertProps) => {
    shown.alerts.push(p);
    return 'alert';
  },
}));
vi.mock('./ExportCard', () => ({
  ExportCard: (p: ExportCardProps) => {
    shown.exportCard = p;
    return 'export';
  },
}));
vi.mock('./ImportPreviewCard', () => ({
  ImportPreviewCard: (p: PreviewCardProps) => {
    shown.previewCard = p;
    return 'preview';
  },
  ImportPreviewFooter: (p: PreviewFooterProps) => {
    shown.footer = p;
    return 'footer';
  },
}));
vi.mock('@/intl', () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
  formatNumber: (n: number) => String(n),
  formatFileSize: (bytes: number) => `${bytes} bytes`,
}));
vi.mock('@/config', () => ({ fileUrl: (id: string) => `/files?id=${id}` }));
vi.mock('@/platform/openDocument', () => ({ saveDocument: vi.fn() }));

const uploadFile = vi.fn();
vi.mock('@/api/postFiles', () => ({
  MAX_UPLOAD_BYTES: 100,
  uploadFile: (...args: unknown[]) => uploadFile(...args),
}));
const graphqlFetch = vi.fn();
vi.mock('@/api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));

import { saveDocument } from '@/platform/openDocument';
import CentralDataPage from './CentralDataPage';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  delete shown.page;
  delete shown.zone;
  delete shown.previewCard;
  delete shown.footer;
  shown.alerts = [];
  shown.buttons = {};
  uploadFile.mockReset();
  graphqlFetch.mockReset();
  vi.mocked(saveDocument).mockReset();
  delete shown.tabs;
  delete shown.tabList;
  delete searchParams.tab;
});

/** Reads the page as it stands now. */
const render = () => {
  shown.alerts = [];
  shown.buttons = {};
  shown.texts = [];
  delete shown.zone;
  delete shown.previewCard;
  delete shown.footer;
  delete shown.exportCard;
  resolve(shown.page!.header);
  resolve(shown.page!.children);
  resolve(shown.page!.contentFooter);
};

const open = () => {
  createRoot(d => {
    dispose = d;
    CentralDataPage({});
  });
  render();
};

// The page starts each step with `void`, so let its awaits run out.
const settle = () => new Promise(r => setTimeout(r, 0));

const alerts = () =>
  shown.alerts.map(alert => [alert.testId, resolve(alert.children)]);

const xlsx = (name = 'units.xlsx', size = 10) =>
  new File([new Uint8Array(size)], name);

/** A preview or import answer: one unit updated, or the given row errors. */
const summary = (errorCount = 0) => ({
  __typename: 'CentralDataImportNode',
  tables: [
    {
      table: 'UNIT',
      inserted: 0,
      updated: errorCount ? 0 : 1,
      deleted: 0,
      unchanged: 2,
      errorCount,
    },
  ],
  changes: errorCount
    ? []
    : [
        {
          sheet: 'unit',
          row: 3,
          record: 'Tab',
          change: 'UPDATED',
          fields: [{ column: 'index', from: '1', to: '2' }],
        },
      ],
  errors: errorCount
    ? [{ sheet: 'unit', row: 3, column: 'index', message: 'no' }]
    : [],
  errorCount,
});
const refusal = (error: Record<string, unknown>) => ({
  __typename: 'CentralDataImportError',
  error,
});
const answer = (field: 'importPreview' | 'import', response: unknown) => ({
  kind: 'success',
  data: { centralServer: { centralData: { [field]: response } } },
});

const errorsFileAnswer = (response: unknown) => ({
  kind: 'success',
  data: { centralServer: { centralData: { errorsFile: response } } },
});

/** Picks a file whose preview is one updated unit; returns at the preview. */
const previewed = async () => {
  uploadFile.mockResolvedValue({ kind: 'uploaded', fileId: 'f1' });
  graphqlFetch.mockResolvedValueOnce(answer('importPreview', summary()));
  const file = xlsx();
  open();
  shown.zone!.onPick([file], []);
  await settle();
  render();
  return file;
};

describe('CentralDataPage tabs', () => {
  it('opens on Import, with Export second and the open tab in the address (OMS-REG-CDIO-01.70)', () => {
    open();

    expect(shown.tabList!.tabs.map(tab => tab.value)).toEqual([
      'import',
      'export',
    ]);
    expect(shown.tabs!.value).toBe('import');
    expect(shown.zone).toBeDefined();
    expect(shown.exportCard).toBeUndefined();

    shown.tabs!.onValueChange('export');
    render();
    expect(searchParams.tab).toBe('export');
    expect(shown.exportCard).toBeDefined();
    expect(shown.zone).toBeUndefined();

    // Import is the default, so its address carries no tab.
    shown.tabs!.onValueChange('import');
    expect(searchParams.tab).toBeUndefined();
  });

  it('opens on Export from an address that names it (OMS-REG-CDIO-01.70)', () => {
    searchParams.tab = 'export';
    open();

    expect(shown.tabs!.value).toBe('export');
    expect(shown.exportCard).toBeDefined();
  });

  it('keeps the preview on Import and the ticked tables on Export across tabs (OMS-REG-CDIO-01.71)', async () => {
    await previewed();

    shown.tabs!.onValueChange('export');
    render();
    // The pinned footer is Import's alone.
    expect(shown.previewCard).toBeUndefined();
    expect(shown.footer).toBeUndefined();
    shown.exportCard!.setFilters(0, 'ticked', true);

    shown.tabs!.onValueChange('import');
    render();
    expect(shown.previewCard!.preview.fileId).toBe('f1');
    expect(shown.footer!.preview.fileId).toBe('f1');

    shown.tabs!.onValueChange('export');
    render();
    expect(shown.exportCard!.filters[0]!.ticked).toBe(true);
  });
});

describe('CentralDataPage import', () => {
  it('uploads a picked file and shows its preview (OMS-REG-CDIO-01.12)', async () => {
    const file = await previewed();

    expect(uploadFile).toHaveBeenCalledWith(file);
    expect(graphqlFetch).toHaveBeenCalledWith(CentralDataImportPreview, {
      fileId: 'f1',
    });
    // The preview card gets the upload's id (Import sends it) and name
    // (its title, ui-surface.md § preview card).
    expect(shown.previewCard!.preview).toEqual({
      fileId: 'f1',
      fileName: 'units.xlsx',
      summary: summary(),
    });
    // The pinned footer acts on the same upload.
    expect(shown.footer!.preview).toBe(shown.previewCard!.preview);
    expect(alerts()).toEqual([]);
  });

  it('shows the zone working while the chosen file uploads and previews (OMS-REG-CDIO-01.101)', async () => {
    let uploaded!: (result: unknown) => void;
    uploadFile.mockReturnValueOnce(
      new Promise(resolve => (uploaded = resolve))
    );
    open();
    expect(shown.zone!.loading).toBe(false);

    shown.zone!.onPick([xlsx()], []);
    render();
    expect(shown.zone!.loading).toBe(true);

    uploaded({ kind: 'failed', message: 'offline' });
    await settle();
    render();
    expect(shown.zone!.loading).toBe(false);
  });

  it('suggests starting from an export until a file is chosen (OMS-REG-CDIO-01.75)', async () => {
    uploadFile.mockResolvedValue({ kind: 'uploaded', fileId: 'f1' });
    graphqlFetch.mockResolvedValueOnce(answer('importPreview', summary()));
    open();
    expect(shown.texts).toEqual([
      'messages.central-data-import-limits',
      'messages.central-data-import-start-from-export',
    ]);

    shown.zone!.onPick([xlsx()], []);
    await settle();
    render();
    expect(shown.previewCard).toBeDefined();
    expect(shown.texts).not.toContain(
      'messages.central-data-import-start-from-export'
    );
  });

  it('swaps the drop zone for the file and Choose another file while a preview is open (OMS-REG-CDIO-01.66)', async () => {
    await previewed();

    expect(shown.zone).toBeUndefined();
    shown.buttons['central-data-choose-another']!.onClick();
    render();

    // The preview and its footer go; the zone is back for the next file.
    expect(shown.previewCard).toBeUndefined();
    expect(shown.footer).toBeUndefined();
    expect(shown.zone).toBeDefined();
  });

  it('holds Choose another file while the errors file downloads, then clears its failure banner', async () => {
    await previewed();
    let saved!: (result: { ok: false; message: string }) => void;
    vi.mocked(saveDocument).mockReturnValueOnce(
      new Promise(resolve => (saved = resolve))
    );
    graphqlFetch.mockResolvedValueOnce(
      errorsFileAnswer({ __typename: 'CentralDataExportNode', fileId: 'e1' })
    );

    shown.footer!.onDownloadErrors();
    await settle();
    render();
    expect(shown.buttons['central-data-choose-another']!.disabled).toBe(true);

    saved({ ok: false, message: 'denied' });
    await settle();
    render();
    expect(alerts()).toEqual([
      [
        'central-data-import-error',
        'error.unable-to-download-file {"reason":"denied"}',
      ],
    ]);

    shown.buttons['central-data-choose-another']!.onClick();
    render();
    expect(shown.zone).toBeDefined();
    expect(alerts()).toEqual([]);
  });

  it("saves the errors file under the upload's name, marked (errors) (OMS-REG-CDIO-01.45)", async () => {
    await previewed();
    vi.mocked(saveDocument).mockResolvedValueOnce({ ok: true, saved: true });
    graphqlFetch.mockResolvedValueOnce(
      errorsFileAnswer({ __typename: 'CentralDataExportNode', fileId: 'e1' })
    );

    shown.footer!.onDownloadErrors();
    await settle();
    render();

    expect(saveDocument).toHaveBeenCalledWith(
      '/files?id=e1',
      'units (errors).xlsx'
    );
    expect(shown.previewCard!.preview.fileId).toBe('f1');
    expect(alerts()).toEqual([]);
  });

  it('closes the preview and asks for the file again when the upload expired before the errors file (OMS-REG-CDIO-01.50)', async () => {
    await previewed();
    graphqlFetch.mockResolvedValueOnce(
      errorsFileAnswer(
        refusal({ __typename: 'CentralDataUploadExpired', description: '' })
      )
    );

    shown.footer!.onDownloadErrors();
    await settle();
    render();

    expect(saveDocument).not.toHaveBeenCalled();
    expect(shown.previewCard).toBeUndefined();
    expect(shown.footer).toBeUndefined();
    expect(alerts()).toEqual([
      ['central-data-import-error', 'error.central-data-upload-expired'],
    ]);
  });

  it('imports the previewed upload, then replaces the preview with the counts (OMS-REG-CDIO-01.14, .18)', async () => {
    await previewed();
    graphqlFetch.mockResolvedValueOnce(answer('import', summary()));

    shown.footer!.onConfirm();
    await settle();
    render();

    expect(graphqlFetch).toHaveBeenLastCalledWith(CentralDataImport, {
      fileId: 'f1',
    });
    // ui-surface.md § after import: the preview is replaced by the banner.
    expect(shown.previewCard).toBeUndefined();
    expect(shown.footer).toBeUndefined();
    expect(alerts()).toEqual([
      [
        'central-data-imported',
        'messages.central-data-imported {"new":"0","updated":"1","deleted":"0"}',
      ],
    ]);
  });

  it('keeps the preview, with the new errors, when the import finds row errors (OMS-REG-CDIO-01.62)', async () => {
    await previewed();
    graphqlFetch.mockResolvedValueOnce(answer('import', summary(1)));

    shown.footer!.onConfirm();
    await settle();
    render();

    // Nothing was applied (rules.md § preview and import), so no banner.
    expect(shown.previewCard!.preview.summary).toEqual(summary(1));
    expect(alerts()).toEqual([]);
  });

  it('closes the preview and asks for the file again when the upload expired (OMS-REG-CDIO-01.50)', async () => {
    await previewed();
    graphqlFetch.mockResolvedValueOnce(
      answer(
        'import',
        refusal({ __typename: 'CentralDataUploadExpired', description: '' })
      )
    );

    shown.footer!.onConfirm();
    await settle();
    render();

    // ui-surface.md § import card: "the preview card closes".
    expect(shown.previewCard).toBeUndefined();
    expect(shown.footer).toBeUndefined();
    expect(alerts()).toEqual([
      ['central-data-import-error', 'error.central-data-upload-expired'],
    ]);
  });

  // The failed call itself is the global error modal's to report
  // (centralDataLogic's `failed`); the page must not offer Import again on
  // counts the import may already have applied.
  it('previews the file again when the import call fails, holding Import until it returns (OMS-REG-CDIO-01.102)', async () => {
    await previewed();
    // The import landed but its reply was lost: nothing is left to change.
    const applied = {
      ...summary(),
      tables: [{ ...summary().tables[0], updated: 0, unchanged: 3 }],
      changes: [],
    };
    let rechecked!: (result: unknown) => void;
    graphqlFetch
      .mockResolvedValueOnce({ kind: 'unexpectedError' })
      .mockReturnValueOnce(new Promise(resolve => (rechecked = resolve)));

    shown.footer!.onConfirm();
    await settle();
    render();
    expect(graphqlFetch).toHaveBeenLastCalledWith(CentralDataImportPreview, {
      fileId: 'f1',
    });
    // Import stays busy on the old counts until the fresh preview is in.
    expect(shown.footer!.busy).toBe(true);

    rechecked(answer('importPreview', applied));
    await settle();
    render();
    expect(shown.footer!.busy).toBe(false);
    expect(shown.previewCard!.preview).toEqual({
      fileId: 'f1',
      fileName: 'units.xlsx',
      summary: applied,
    });
    expect(alerts()).toEqual([
      [
        'central-data-import-rechecked',
        'messages.central-data-import-rechecked',
      ],
    ]);

    // Choosing another file clears the banner with the preview.
    shown.buttons['central-data-choose-another']!.onClick();
    render();
    expect(alerts()).toEqual([]);
  });

  it('closes the preview and asks for the file again when the check after a failed import fails too (OMS-REG-CDIO-01.103)', async () => {
    await previewed();
    graphqlFetch
      .mockResolvedValueOnce({ kind: 'unexpectedError' })
      .mockResolvedValueOnce({ kind: 'unexpectedError' });

    shown.footer!.onConfirm();
    await settle();
    render();

    expect(shown.previewCard).toBeUndefined();
    expect(shown.footer).toBeUndefined();
    expect(shown.zone!.loading).toBe(false);
    expect(alerts()).toEqual([
      ['central-data-import-error', 'error.central-data-import-unconfirmed'],
    ]);
  });

  it('refuses a workbook over the row cap, naming its rows and the limit (OMS-REG-CDIO-01.7)', async () => {
    uploadFile.mockResolvedValue({ kind: 'uploaded', fileId: 'f1' });
    graphqlFetch.mockResolvedValueOnce(
      answer(
        'importPreview',
        refusal({
          __typename: 'CentralDataTooManyRows',
          description: '',
          rowCount: 100001,
          maxRows: 100000,
        })
      )
    );
    open();
    shown.zone!.onPick([xlsx()], []);
    await settle();
    render();

    expect(shown.previewCard).toBeUndefined();
    expect(alerts()).toEqual([
      [
        'central-data-import-error',
        'error.central-data-too-many-rows {"rowCount":"100001","maxRows":"100000"}',
      ],
    ]);
  });

  it('refuses a file over the size limit by name, uploading nothing (OMS-REG-CDIO-01.6)', async () => {
    open();
    shown.zone!.onPick([], [{ file: xlsx('big.xlsx', 101), reason: 'size' }]);
    await settle();
    render();

    expect(uploadFile).not.toHaveBeenCalled();
    expect(alerts()).toEqual([
      [
        'central-data-import-error',
        'error.file-exceeds-size-limit {"filename":"big.xlsx","maxSize":"100 bytes"}',
      ],
    ]);
  });
});
