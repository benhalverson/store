import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL, SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID } from "../config";

type SquareCard = {
  attach(selector: string): Promise<void>;
  destroy(): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: unknown }>;
};

declare global {
  interface Window {
    Square?: {
      payments(applicationId: string, locationId: string): Promise<{
        card(): Promise<SquareCard>;
      }>;
    };
  }
}

const SDK_URL =
  import.meta.env.VITE_SQUARE_ENVIRONMENT === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

async function loadSquareSdk() {
  if (window.Square) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Square failed to load")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Square failed to load"));
    document.head.appendChild(script);
  });
}

export function SquarePaymentForm({
  cartId,
  customerEmail,
  disabled,
  onError,
}: {
  cartId: string;
  customerEmail?: string;
  disabled?: boolean;
  onError: (message: string | null) => void;
}) {
  const navigate = useNavigate();
  const cardRef = useRef<SquareCard | null>(null);
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await loadSquareSdk();
        if (!window.Square) throw new Error("Square is unavailable");
        const payments = await window.Square.payments(
          SQUARE_APPLICATION_ID,
          SQUARE_LOCATION_ID,
        );
        const card = await payments.card();
        await card.attach("#square-card-container");
        if (active) {
          cardRef.current = card;
          setReady(true);
        } else {
          await card.destroy();
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : "Payment form failed to load");
      }
    })();
    return () => {
      active = false;
      const card = cardRef.current;
      cardRef.current = null;
      if (card) void card.destroy();
    };
  }, [onError]);

  const pay = async () => {
    if (!cardRef.current) return;
    setSubmitting(true);
    onError(null);
    try {
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        throw new Error("Please check your payment details and try again");
      }
      const response = await fetch(`${BASE_URL}/cart/${cartId}/square-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sourceId: tokenResult.token,
          idempotencyKey: idempotencyKeyRef.current,
          customerEmail,
        }),
      });
      const payload = (await response.json()) as { error?: string; orderId?: string };
      if (!response.ok) throw new Error(payload.error ?? "Payment failed");
      navigate("/order/complete", { state: { orderId: payload.orderId } });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div id="square-card-container" aria-label="Card payment details" />
      <button
        type="button"
        disabled={!ready || disabled || submitting}
        onClick={pay}
        className="w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Processing…" : "Pay securely"}
      </button>
      <p className="text-center text-xs text-gray-500">Payments processed securely by Square</p>
    </div>
  );
}
