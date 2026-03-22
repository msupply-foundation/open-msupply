import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import SettingsScreen from "../screens/SettingsScreen";
import IssueScreen from "../screens/issue/IssueScreen";
import ItemSearchScreen from "../screens/issue/ItemSearchScreen";
import DemographicsScreen from "../screens/issue/DemographicsScreen";
import ReceiveListScreen from "../screens/receive/ReceiveListScreen";
import ReceiveDetailScreen from "../screens/receive/ReceiveDetailScreen";
import StocktakeScreen from "../screens/stocktake/StocktakeScreen";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/settings" element={<SettingsScreen />} />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <LoginScreen />
            )
          }
        />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomeScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/issue"
          element={
            <RequireAuth>
              <IssueScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/issue/search"
          element={
            <RequireAuth>
              <ItemSearchScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/issue/demographics"
          element={
            <RequireAuth>
              <DemographicsScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/receive"
          element={
            <RequireAuth>
              <ReceiveListScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/receive/:id"
          element={
            <RequireAuth>
              <ReceiveDetailScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/stocktake"
          element={
            <RequireAuth>
              <StocktakeScreen />
            </RequireAuth>
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={isAuthenticated ? "/home" : "/login"}
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
