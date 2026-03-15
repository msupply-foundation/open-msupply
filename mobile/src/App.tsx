import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./api/apolloClient";
import { AuthProvider } from "./hooks/useAuth";
import AppRouter from "./navigation/AppRouter";

export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ApolloProvider>
  );
}
