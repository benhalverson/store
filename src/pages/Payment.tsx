import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadStripe, type PaymentIntentResult } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
const stripePromise = loadStripe(publishableKey);

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const result: PaymentIntentResult = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // You can change return_url to an order confirmation route
          return_url: window.location.origin + "/order/complete",
        },
        redirect: "if_required",
      });

      if (result?.error) {
        setError(result.error.message || "Payment confirmation failed");
      } else if (result?.paymentIntent) {
        // If payment succeeded or requires action handled by Stripe, navigate to a success page
        navigate("/order/complete");
      } else {
        // Unknown result — navigate to a generic page or reload
        navigate("/order/complete");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4">
      <PaymentElement />
      {error && <div className="text-red-600 mt-2">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="mt-4 w-full rounded bg-indigo-600 text-white py-2">
        {loading ? "Processing…" : "Pay"}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const loc = useLocation();
  const q = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const clientSecret = q.get("client_secret");

  if (!publishableKey) {
    return (
      <div className="p-8 text-center text-red-600">
        Missing Stripe publishable key. Set `VITE_STRIPE_PUBLISHABLE_KEY`.
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="p-8 text-center">No payment session available.</div>
    );
  }

  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <h2 className="text-lg font-medium mb-6">Complete payment</h2>
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm />
        </Elements>
      </div>
    </div>
  );
}
