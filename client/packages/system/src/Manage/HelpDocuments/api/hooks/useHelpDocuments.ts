import {
  FnUtils,
  keepPreviousData,
  LIST_KEY,
  useIntlUtils,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { HELP_DOCUMENT } from './keys';
import { useHelpDocumentGraphQL } from '../useHelpDocumentGraphQL';

export const useHelpDocuments = () => {
  // QUERY
  const { data, isFetching, isError, refetch } = useGetList();

  // INSERT (creates the parent row; the file upload is a separate HTTP POST)
  const {
    mutateAsync: insertMutation,
    isPending: isInserting,
    error: insertError,
  } = useInsertHelpDocument();

  // DELETE
  const {
    mutateAsync: deleteMutation,
    isPending: isDeleting,
    error: deleteError,
  } = useDeleteHelpDocument();

  // Returns the new id so the caller can POST the file under it.
  const insert = async (title: string) => {
    const id = FnUtils.generateUUID();
    const result = await insertMutation({ id, title });
    return { id, result };
  };

  const deleteHelpDocument = async (id: string) => deleteMutation(id);

  return {
    query: { data, isFetching, isError, refetch },
    insert: { insert, isInserting, insertError },
    delete: { deleteHelpDocument, isDeleting, deleteError },
  };
};

const useGetList = () => {
  const { helpDocumentApi } = useHelpDocumentGraphQL();
  const queryKey = [HELP_DOCUMENT, LIST_KEY];

  const queryFn = async () => {
    const query = await helpDocumentApi.helpDocuments({
      first: 1000,
      offset: 0,
    });
    const { nodes, totalCount } = query?.helpDocuments;
    return { nodes, totalCount };
  };

  return useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
  });
};

const useInsertHelpDocument = () => {
  const { helpDocumentApi, queryClient } = useHelpDocumentGraphQL();
  const { translateServerError } = useIntlUtils();

  const mutationFn = async (input: { id: string; title: string }) => {
    try {
      const result = await helpDocumentApi.insertHelpDocument({ input });
      return result?.centralServer?.helpDocument?.insertHelpDocument;
    } catch (error) {
      return {
        __typename: 'InsertHelpDocumentError' as const,
        error: { description: translateServerError((error as Error)?.message) },
      };
    }
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HELP_DOCUMENT] });
    },
    onError: e => {
      console.error(e);
    },
  });
};

const useDeleteHelpDocument = () => {
  const { helpDocumentApi, queryClient } = useHelpDocumentGraphQL();
  const { translateServerError } = useIntlUtils();

  const mutationFn = async (id: string) => {
    try {
      const result = await helpDocumentApi.deleteHelpDocument({ id });
      return result?.centralServer?.helpDocument?.deleteHelpDocument;
    } catch (error) {
      return {
        __typename: 'DeleteHelpDocumentError' as const,
        error: { description: translateServerError((error as Error)?.message) },
      };
    }
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HELP_DOCUMENT] });
    },
    onError: e => {
      console.error(e);
    },
  });
};
