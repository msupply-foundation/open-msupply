import { ContactFormNodeType, InsertContactFormInput } from '@common/types';
import { useState } from 'react';
import { useContactFormGraphQL } from './useContactFormGraphQL';
import {
  FnUtils,
  isEmpty,
  useMutation,
  useDebounceCallback,
  useTranslation,
  RegexUtils,
} from '@openmsupply-client/common';

type ContactFormInput = Pick<
  InsertContactFormInput,
  'contactType' | 'replyEmail' | 'body'
>;

export function useContactForm() {
  const defaultDraft: ContactFormInput = {
    replyEmail: '',
    body: '',
    contactType: ContactFormNodeType.Feedback,
  };
  const [draft, setDraft] = useState<ContactFormInput>(defaultDraft);
  const [emailError, setEmailError] = useState('');
  const t = useTranslation();

  const { mutateAsync: insert } = useInsert();

  const updateDraft = (newData: Partial<ContactFormInput>) => {
    const newDraft: ContactFormInput = { ...draft, ...newData };
    setDraft(newDraft);
  };

  const resetDraft = () => {
    setDraft(defaultDraft);
  };

  const debounceValidation = useDebounceCallback(
    (email: string) => {
      if (!RegexUtils.checkEmailIsValid(email))
        return setEmailError(t('messages.error-not-valid-email'));
      return setEmailError('');
    },
    [setEmailError],
    100
  );

  const isValidInput =
    !!draft.replyEmail &&
    !!draft.body &&
    RegexUtils.checkEmailIsValid(draft.replyEmail);

  return {
    updateDraft,
    resetDraft,
    saveFeedback: insert,
    draft,
    isValidInput,
    debounceValidation,
    emailError,
  };
}

const useInsert = () => {
  const { api, storeId } = useContactFormGraphQL();

  const mutationFn = async ({
    contactType,
    replyEmail,
    body,
  }: ContactFormInput) => {
    const apiResult = await api.insertContactForm({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        replyEmail,
        body,
        contactType,
      },
    });

    if (!isEmpty(apiResult)) {
      const result = apiResult.insertContactForm;

      if (result.__typename === 'InsertResponse') {
        return result;
      }
    }
  };

  return useMutation({
    mutationFn,
  });
};
