// POST files to one of the server's REST upload routes (not GraphQL): the
// sync-file store, the fridge-tag import and the plugin bundle upload. Each is
// a multipart body with the files under one field, the session cookie (same
// origin, as the GraphQL client) and a JSON answer. Never throws: a transport
// failure comes back as `unreachable`, and what a response means is the
// caller's — each route answers in its own shape. Extracted at the third
// identical copy (rule of three).

export const FILES_FIELD = 'files';

export type PostFilesResult =
  | { kind: 'response'; response: Response }
  | { kind: 'unreachable'; message: string };

export const postFiles = async (
  url: string,
  files: readonly File[]
): Promise<PostFilesResult> => {
  const body = new FormData();
  for (const file of files) body.append(FILES_FIELD, file, file.name);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      body,
    });
    return { kind: 'response', response };
  } catch (error) {
    return {
      kind: 'unreachable',
      message: error instanceof Error ? error.message : String(error),
    };
  }
};
