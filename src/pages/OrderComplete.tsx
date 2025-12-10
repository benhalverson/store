import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function OrderComplete() {
  useEffect(() => {
    try {
      localStorage.removeItem("cartId");
    } catch (e) {
      // ignore localStorage errors in some environments
      console.log('Could not clear cartId from localStorage', e);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-xl w-full bg-white shadow rounded-lg p-8 text-center">
        <h1 className="text-2xl font-semibold mb-4">Thank you — your order is complete</h1>
        <p className="text-gray-600 mb-6">
          We received your payment. You will receive an email confirmation shortly.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/" className="rounded-md bg-indigo-600 text-white px-4 py-2">
            Back to shop
          </Link>
          <Link to="/profile" className="rounded-md border px-4 py-2">
            View account
          </Link>
        </div>
      </div>
    </div>
  );
}
