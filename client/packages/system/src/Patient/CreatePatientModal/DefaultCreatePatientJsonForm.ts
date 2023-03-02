export const createPatient = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  definitions: {
    Gender: {
      enum: [
        'FEMALE',
        'MALE',
        'TRANSGENDER',
        'TRANSGENDER_MALE',
        'TRANSGENDER_FEMALE',
        'UNKNOWN',
        'NON_BINARY',
      ],
      type: 'string',
    },
    PatientEnrolment: {
      properties: {
        code: {
          description:
            'Patient code, e.g. national id or other patient identifier',
          type: 'string',
        },
        code2: {
          description: 'Secondary patient code, e.g. another type of health id',
          type: 'string',
        },
        dateOfBirth: {
          description: '184099003 Date of birth',
          format: 'date',
          type: 'string',
        },
        firstName: {
          type: 'string',
        },
        gender: {
          $ref: '#/definitions/Gender',
          description: '394744001 Gender unspecified',
        },
        lastName: {
          type: 'string',
        },
      },
      type: 'object',
    },
  },
  type: 'object',
  allOf: [
    {
      $ref: '#/definitions/PatientEnrolment',
    },
  ],
};

export const createPatientUI = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Control',
      scope: '#/properties/code',
      label: 'National Health ID',
      options: {
        pattern: '^[0-9]{10}$',
        examples: ['1234567890'],
      },
    },
    {
      type: 'Control',
      label: 'NUIC',
      scope: '#/properties/code2',
    },
    {
      type: 'Control',
      scope: '#/properties/firstName',
      label: 'First Name',
    },
    {
      type: 'Control',
      scope: '#/properties/lastName',
      label: 'Last Name',
    },
    {
      type: 'Control',
      label: 'Date of Birth',
      scope: '#/properties/dateOfBirth',
      options: {
        disableFuture: true,
      },
    },
    {
      type: 'Control',
      scope: '#/properties/gender',
      label: 'Gender',
      options: {
        show: [
          ['MALE', 'Male'],
          ['FEMALE', 'Female'],
          ['TRANSGENDER', 'Transgender'],
        ],
      },
    },
  ],
};
