import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CartContextProps, CartItem } from "../interfaces/cartItem";
import { BASE_URL } from "../config";

const CartContext = createContext<CartContextProps | undefined>(undefined);

const TAB_ID = Math.random().toString(36).slice(2);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const storedCart = localStorage.getItem("cart");
    console.log('storedCart', storedCart);
    try {
      const parsedCart = storedCart ? JSON.parse(storedCart) : [];
      return Array.isArray(parsedCart) ? parsedCart.filter(Boolean) : [];
    } catch {
      return [];
    }
  });

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel("cart_channel");
    channelRef.current = channel;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "sync" && message.sender !== TAB_ID) {
        if (Array.isArray(message.payload)) {
          setCart(message.payload);
        }
      } else if (message.type === "cart_meta" && message.sender !== TAB_ID) {
        if (message.cartId && !localStorage.getItem("cartId")) {
          localStorage.setItem("cartId", message.cartId);
        }
      }
    };

    channel.addEventListener("message", handler);

    const resync = () => {
      const stored = localStorage.getItem("cart");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCart(parsed.filter(Boolean));
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("focus", resync);

    return () => {
      channel.removeEventListener("message", handler);
      window.removeEventListener("focus", resync);
      channel.close();
    };
  }, []);

  const syncCart = (newCart: CartItem[]) => {
    localStorage.setItem("cart", JSON.stringify(newCart));
    channelRef.current?.postMessage({
      type: "sync",
      sender: TAB_ID,
      payload: newCart,
    });
  };

  // Remote Cart Integration -------------------------------------------------
  let cartIdCache: string | null = null;
  let cartIdPromise: Promise<string> | null = null;

  const getCachedCartId = () => {
    if (cartIdCache) return cartIdCache;
    const stored = localStorage.getItem("cartId");
    if (stored) cartIdCache = stored;
    return cartIdCache;
  };

  const ensureCartId = async (): Promise<string> => {
    const existing = getCachedCartId();
    if (existing) return existing;
    if (cartIdPromise) return cartIdPromise;
    cartIdPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/cart/create`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to create cart (${res.status})`);
        const data = (await res.json()) as { cartId?: string };
        if (!data.cartId) throw new Error("cartId missing in response");
        localStorage.setItem("cartId", data.cartId);
        cartIdCache = data.cartId;
        channelRef.current?.postMessage({
          type: "cart_meta",
          sender: TAB_ID,
          cartId: data.cartId,
        });
        return data.cartId;
      } finally {
        cartIdPromise = null;
      }
    })();
    return cartIdPromise;
  };

  const optimisticAdd = (item: CartItem): CartItem[] => {
    let snapshot: CartItem[] = [];
    setCart((prev) => {
      snapshot = prev.map((p) => ({ ...p }));
      const existingItem = prev.find(
        (p) =>
          p.id === item.id &&
          p.color === item.color &&
          p.filamentType === item.filamentType &&
          p.skuNumber === item.skuNumber
      );
      const updatedCart = existingItem
        ? prev.map((p) =>
            p.id === item.id &&
            p.color === item.color &&
            p.filamentType === item.filamentType &&
            p.skuNumber === item.skuNumber
              ? { ...p, quantity: p.quantity + item.quantity }
              : p
          )
        : [...prev, item];
      syncCart(updatedCart);
      return updatedCart;
    });
    return snapshot;
  };

  const rollback = (previous: CartItem[]) => {
    setCart(previous);
    syncCart(previous);
  };

  const remoteAdd = async (payload: {
    cartId: string;
    skuNumber: string;
    quantity: number;
    color: string;
    filamentType: string;
  }) => {
    const res = await fetch(`${BASE_URL}/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let errorMsg = `Add to cart failed (${res.status})`;
      try {
        const data: unknown = await res.json();
        if (
          data &&
          typeof data === 'object' &&
          Object.prototype.hasOwnProperty.call(data, 'error')
        ) {
          const errVal = (data as { error: unknown }).error;
          errorMsg = typeof errVal === 'string' ? errVal : errorMsg;
        }
      } catch {
        // ignore parse errors
      }
      throw new Error(errorMsg);
    }
  };

  const addToCart = async (item: CartItem) => {
    try {
      if (!item || !item.id) return;
      if (!item.skuNumber) {
        console.error("skuNumber missing – cannot add to cart remotely");
        return;
      }
      const cartId = await ensureCartId();
      const previous = optimisticAdd(item);
      try {
        const colorValue = item.color.startsWith('#') ? item.color : `#${item.color}`;
        await remoteAdd({
          cartId,
          skuNumber: item.skuNumber,
          quantity: item.quantity,
          color: colorValue,
          filamentType: item.filamentType,
        });
      } catch (err) {
        console.error(err);
        rollback(previous);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeFromCart = (itemToRemove: CartItem) => {
    setCart((prev) => {
      const updatedCart = prev.filter(
        (item) =>
          !(
            item.id === itemToRemove.id &&
            item.color === itemToRemove.color &&
            item.filamentType === itemToRemove.filamentType
          )
      );

      syncCart(updatedCart);
      return updatedCart;
    });
  };

  const clearCart = () => {
    const emptyCart: CartItem[] = [];
    setCart(emptyCart);
    syncCart(emptyCart);
  };

  const updateQuantity = async (itemToUpdate: CartItem, quantity: number) => {
    console.log('updateQuantity called with', itemToUpdate, quantity);
    // Clamp quantity minimum 1
    const newQty = Math.max(1, quantity);
    let previous: CartItem[] = [];
    setCart((prev) => {
      previous = prev.map(p => ({ ...p }));
      const updatedCart = prev.map((item) => {
        if (
          item.id === itemToUpdate.id &&
          item.color === itemToUpdate.color &&
          item.filamentType === itemToUpdate.filamentType &&
          item.skuNumber === itemToUpdate.skuNumber
        ) {
          return { ...item, quantity: newQty };
        }
        return item;
      });
      syncCart(updatedCart);
      return updatedCart;
    });

    try {
      const cartId = localStorage.getItem('cartId');
      if (!cartId) throw new Error('Missing cartId for update');
      const itemId = itemToUpdate.id;
      const res = await fetch(`${BASE_URL}/cart/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cartId, itemId, quantity: newQty })
      });
      if (!res.ok) {
        let errMsg = `Failed to update quantity (${res.status})`;
        try {
          const data: unknown = await res.json();
          if (data && typeof data === 'object' && 'error' in data) {
            errMsg = String((data as { error: unknown }).error);
          }
        } catch {/* ignore */}
        throw new Error(errMsg);
      }
    } catch (e) {
      console.error(e);
      // rollback
      setCart(previous);
      syncCart(previous);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, updateQuantity }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be inside a CartProvider");
  return context;
}
