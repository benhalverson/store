import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!pk) {
      console.warn('VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe checkout will not work.');
    }
    stripePromise = loadStripe(pk || '');
  }
  return stripePromise;
};
