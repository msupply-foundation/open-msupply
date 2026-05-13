import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function downloadDir(): string {
  const configured = process.env.OMSUPPLY_DOWNLOAD_DIR;
  if (configured && configured.length > 0) return configured;
  return path.join(os.tmpdir(), 'open-msupply-mcp');
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  // RFC 5987 filename*=UTF-8''... preferred, fall back to filename="..."
  const starMatch = /filename\*\s*=\s*[^']*''([^;]+)/i.exec(header);
  if (starMatch) {
    try {
      return decodeURIComponent(starMatch[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // fall through
    }
  }
  const match = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  if (match) return match[1].trim();
  return null;
}

function extensionFromMime(mime: string | null): string {
  if (!mime) return '';
  const m = mime.split(';')[0].trim().toLowerCase();
  switch (m) {
    case 'application/pdf':
      return '.pdf';
    case 'text/html':
      return '.html';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return '.xlsx';
    case 'application/vnd.ms-excel':
      return '.xls';
    case 'text/csv':
      return '.csv';
    case 'application/json':
      return '.json';
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    default:
      return '';
  }
}

export function fileQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'download_file',
      category: 'files',
      kind: 'query',
      description:
        'Download a file from the Open mSupply server by id (typically a fileId returned by generate_report) and save it to a local directory. Returns the local path so it can be read or opened. Defaults to a subfolder of the OS temp directory; override with OMSUPPLY_DOWNLOAD_DIR env var.',
      schema: {
        id: z
          .string()
          .describe('The file id (e.g. fileId returned by generate_report)'),
        filename: z
          .string()
          .optional()
          .describe(
            'Override the saved filename. By default the server-provided filename (or the file id plus a guessed extension) is used.'
          ),
      },
      handler: async (args) => {
        const id = args.id as string;
        const overrideFilename = args.filename as string | undefined;

        const baseUrl = await client.getBaseUrl();
        const token = await client.getAuthToken();

        const url = `${baseUrl}/files?id=${encodeURIComponent(id)}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          return {
            content: [
              {
                type: 'text' as const,
                text: `Failed to download file ${id}: HTTP ${res.status} ${res.statusText}${body ? `\n${body}` : ''}`,
              },
            ],
            isError: true,
          };
        }

        const dir = downloadDir();
        fs.mkdirSync(dir, { recursive: true });

        const serverName = filenameFromContentDisposition(
          res.headers.get('content-disposition')
        );
        const ext = extensionFromMime(res.headers.get('content-type'));
        const filename =
          overrideFilename ?? serverName ?? `${id}${ext}`;
        const safeName = filename.replace(/[/\\]/g, '_');
        const outPath = path.join(dir, safeName);

        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(outPath, buffer);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Saved ${buffer.length} bytes to ${outPath}`,
            },
          ],
        };
      },
    },
  ];
}
