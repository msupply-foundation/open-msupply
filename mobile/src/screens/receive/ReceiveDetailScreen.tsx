import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import BackButton from "../../components/BackButton";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../hooks/useAuth";
import {
  INBOUND_SHIPMENT_DETAIL,
  UPDATE_INBOUND_SHIPMENT,
  UPDATE_INBOUND_LINE,
} from "../../api/graphql/operations";

interface ShipmentLine {
  id: string;
  itemName: string;
  itemId: string;
  numberOfPacks: number;
}

interface ShipmentDetail {
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
  status: string;
  theirReference: string | null;
  lines: { nodes: ShipmentLine[] };
}

const STATUS_PROGRESSION: Record<
  string,
  { label: string; nextStatus: string } | null
> = {
  SHIPPED: { label: "Mark as Delivered", nextStatus: "DELIVERED" },
  DELIVERED: { label: "Mark as Received", nextStatus: "RECEIVED" },
  RECEIVED: { label: "Mark as Verified", nextStatus: "VERIFIED" },
  VERIFIED: null,
};

export default function ReceiveDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { storeId } = useAuth();

  const { data, loading, refetch } = useQuery(INBOUND_SHIPMENT_DETAIL, {
    variables: { storeId: storeId!, id: id! },
    skip: !storeId || !id,
  });

  const [updateShipment, { loading: updating }] = useMutation(
    UPDATE_INBOUND_SHIPMENT
  );
  const [updateLine] = useMutation(UPDATE_INBOUND_LINE);

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [error, setError] = useState<string | null>(null);

  const shipment: ShipmentDetail | null =
    data?.invoice?.__typename === "InvoiceNode" ? data.invoice : null;

  if (loading) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <BackButton to="/receive" />
          <h1 className="screen-header-title">Shipment Detail</h1>
          <div className="w-10" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <BackButton to="/receive" />
          <h1 className="screen-header-title">Shipment Detail</h1>
          <div className="w-10" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">Shipment not found</p>
        </div>
      </div>
    );
  }

  const lines = shipment.lines.nodes;
  const canEditQty = shipment.status === "DELIVERED";
  const progression = STATUS_PROGRESSION[shipment.status];

  const handleStatusChange = async () => {
    if (!progression || !storeId) return;
    setError(null);

    try {
      await updateShipment({
        variables: {
          storeId,
          input: { id: shipment.id, status: progression.nextStatus },
        },
      });
      await refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  };

  const handleLineEdit = async (lineId: string) => {
    if (!storeId) return;

    const newQty = parseInt(editQty, 10);
    if (isNaN(newQty) || newQty < 0) {
      setEditingLineId(null);
      return;
    }

    try {
      await updateLine({
        variables: {
          storeId,
          input: { id: lineId, numberOfPacks: newQty },
        },
      });
      await refetch();
    } catch {
      // Keep old value
    }

    setEditingLineId(null);
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton to="/receive" />
        <h1 className="screen-header-title">Shipment Detail</h1>
        <div className="w-10" />
      </div>

      <div className="screen-body flex flex-col">
        {/* Header card */}
        <div className="card mb-4 space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{shipment.otherPartyName}</p>
            <StatusBadge status={shipment.status} />
          </div>
          <p className="text-sm text-gray-500">
            Invoice #{shipment.invoiceNumber}
          </p>
          {shipment.theirReference && (
            <p className="text-sm text-gray-500">
              Ref: {shipment.theirReference}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Lines */}
        <div className="flex-1 overflow-y-auto">
          <div className="mb-2 flex px-1 text-xs font-medium uppercase text-gray-400">
            <span className="flex-1">Item</span>
            <span className="w-16 text-center">Shipped</span>
            <span className="w-16 text-center">Received</span>
          </div>

          <div className="space-y-1">
            {lines.map((line) => (
              <div
                key={line.id}
                className="card flex items-center py-3"
              >
                <p className="flex-1 min-w-0 truncate text-sm font-medium">
                  {line.itemName}
                </p>
                <span className="w-16 text-center text-sm text-gray-500">
                  {line.numberOfPacks}
                </span>
                <div className="w-16 text-center">
                  {canEditQty ? (
                    editingLineId === line.id ? (
                      <input
                        className="w-14 rounded border border-primary-300 px-1 py-0.5 text-center text-sm"
                        type="number"
                        inputMode="numeric"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        onBlur={() => handleLineEdit(line.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleLineEdit(line.id)
                        }
                        autoFocus
                      />
                    ) : (
                      <button
                        className="rounded bg-primary-50 px-2 py-0.5 text-sm font-medium text-primary-700"
                        onClick={() => {
                          setEditingLineId(line.id);
                          setEditQty(String(line.numberOfPacks));
                        }}
                      >
                        {line.numberOfPacks}
                      </button>
                    )
                  ) : (
                    <span className="text-sm">{line.numberOfPacks}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status action button */}
        {progression && (
          <div className="mt-4 pb-2">
            <button
              className="btn-primary"
              onClick={handleStatusChange}
              disabled={updating}
            >
              {updating ? "Updating..." : progression.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
