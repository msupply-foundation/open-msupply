import { useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { INBOUND_SHIPMENTS } from "../../api/graphql/operations";

interface InboundShipment {
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
  status: string;
  createdDatetime: string;
}

export default function ReceiveListScreen() {
  const navigate = useNavigate();
  const { storeId } = useAuth();

  const { data, loading, refetch } = useQuery(INBOUND_SHIPMENTS, {
    variables: { storeId: storeId! },
    skip: !storeId,
  });

  const shipments: InboundShipment[] = data?.invoices?.nodes ?? [];

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton to="/home" />
        <h1 className="screen-header-title">Receive Stock</h1>
        <div className="w-10" />
      </div>

      <div className="screen-body">
        {loading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        )}

        {!loading && shipments.length === 0 && (
          <EmptyState
            icon="📦"
            title="No pending shipments"
            description="There are no shipped inbound shipments ready to receive"
          />
        )}

        {/* Pull to refresh hint */}
        {!loading && shipments.length > 0 && (
          <button
            onClick={() => refetch()}
            className="mb-3 w-full text-center text-xs text-primary-600"
          >
            Tap to refresh
          </button>
        )}

        <div className="space-y-2">
          {shipments.map((shipment) => (
            <button
              key={shipment.id}
              onClick={() => navigate(`/receive/${shipment.id}`)}
              className="card flex w-full items-center justify-between text-left active:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{shipment.otherPartyName}</p>
                <p className="text-sm text-gray-500">
                  Invoice #{shipment.invoiceNumber} &middot;{" "}
                  {formatDate(shipment.createdDatetime)}
                </p>
              </div>
              <svg
                className="ml-2 h-5 w-5 flex-shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
