declare module 'dashboard/DashboardService' {
  export default function (): JSX.Element;
}

declare module 'transactions/TransactionService' {
  export default function (): JSX.Element;
}

declare module 'customers/CustomerContainer' {
  export default function (): JSX.Element;
}

declare module 'customers/Nav' {
  export default function (): JSX.Element;
}


declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: string;
    }
  }
}