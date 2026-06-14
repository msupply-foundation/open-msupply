import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/manage/global-preferences")({
  component: () => <PlaceholderPage titleKey="app.global-preferences" />,
});
