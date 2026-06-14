import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/cold-chain/equipment")({
  component: () => <PlaceholderPage titleKey="app.equipment" />,
});
