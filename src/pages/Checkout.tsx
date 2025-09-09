import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { BASE_URL } from "../config";
import InputField from "../components/InputField";
import { ProductResponse } from '../interfaces';

const paymentMethods = [
	{ id: "credit-card", title: "Credit card" },
	{ id: "paypal", title: "PayPal" },
];

interface CartApiItem {
	id: number;
	name: string;
	skuNumber: string;
	productId: string;
	quantity: number;
	color: string;
	filamentType: string;
	stripePriceId: string | null;
	price: number;
}

interface CartApiResponse {
	items: CartApiItem[];
	total: number;
}

export default function Checkout() {
	const navigate = useNavigate();
	const [profile, setProfile] = useState<Profile | undefined>(undefined);
	const { updateQuantity } = useCart();
	const [remoteCart, setRemoteCart] = useState<CartApiItem[]>([]);
	const [cartLoading, setCartLoading] = useState(true);
	const [cartError, setCartError] = useState<string | null>(null);
	const [updatingIdx, setUpdatingIdx] = useState<number | null>(null);
	const [shippingInfo, setShippingInfo] = useState({
		shippingAddress: '',
		shippingCity: '',
		shippingState: '',
		shippingZip: '',
	});

	const getProfileData = async () => {
		try {
			const response = await fetch(`${BASE_URL}/profile`, {
				credentials: "include",
			});
			const data: Profile = await response.json();
			setShippingInfo({
				shippingAddress: data.address|| '',
				shippingCity: data.city || '',
				shippingState: data.state || '',
				shippingZip: data.zipCode || '',
			});
			return data;
		} catch (err: unknown) {
			if (err instanceof Error) {
				console.error(`Error fetching profile: ${err.message}`);
			}
		}
	};

	const setProfileData = (data: Profile) => {
		// if the profile is empty the user should fill it out


	};

	const onRemove = async (itemId: number) => {
		const cartId = localStorage.getItem("cartId");
		if (!cartId) return;
		await fetch(`${BASE_URL}/cart/remove`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				cartId,
				itemId: itemId,
			}),
		});
		fetchRemoteCart();
	};

	const fetchRemoteCart = async () => {
		setCartLoading(true);
		setCartError(null);
		try {
			const cartId = localStorage.getItem("cartId");
			if (!cartId) throw new Error("No cartId found");
			const res = await fetch(`${BASE_URL}/cart/${cartId}`, {
				credentials: "include",
			});
			if (!res.ok) throw new Error(`Failed to fetch cart (${res.status})`);
			const data: CartApiResponse = await res.json();
			console.log("/cart/{cartId} response", data);
			setRemoteCart(data.items);
		} catch (e) {
			setCartError(e instanceof Error ? e.message : "Failed to load cart");
			setRemoteCart([]);
		} finally {
			setCartLoading(false);
		}
	};

	const onChangeQty = async (e: React.ChangeEvent<HTMLSelectElement>, idx: number, product: CartApiItem ) => {
		const qty = parseInt(e.target.value, 10);
		setUpdatingIdx(idx);
		await updateQuantity(product, qty);
		await fetchRemoteCart();
		setUpdatingIdx(null);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const data = Object.fromEntries(formData.entries());
		console.log("profile", profile);

		try {
			const response = await fetch(`${BASE_URL}/profile`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
				credentials: "include",
			});
			if (response.ok) {
				const updatedProfile = (await response.json()) as Profile;
				setProfile(updatedProfile);
			} else {
				console.error("Failed to update profile");
			}
		} catch (err) {
			console.error("Error updating profile:", err);
		}
	};

	useEffect(() => {
		getProfileData();
		fetchRemoteCart();
	}, []);

	useEffect(() => {
		if (!cartLoading && !cartError && remoteCart.length === 0) {
			navigate("/cart");
		}
	}, [cartLoading, cartError, remoteCart, navigate]);

	if (cartLoading) {
		return <div className="p-8 text-center">Loading cart...</div>;
	}
	if (cartError) {
		return <div className="p-8 text-center text-red-600">{cartError}</div>;
	}

	return (
		<div className="bg-gray-50">
			<div className="mx-auto max-w-2xl px-4 pb-24 pt-16 sm:px-6 lg:max-w-7xl lg:px-8">
				<h2 className="sr-only">Checkout</h2>

				<form
					className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16"
					onSubmit={handleSubmit}
				>
					{/* Shipping info for estimating shipping cost */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Information</h3>
						<div className="space-y-4">
							<InputField
								label="Address"
								id="shippingAddress"
								value={shippingInfo.shippingAddress}
								onChange={e => setShippingInfo(info => ({ ...info, shippingAddress: e.target.value }))}
							/>
							<InputField
								label="City"
								id="shippingCity"
								value={shippingInfo.shippingCity}
								onChange={e => setShippingInfo(info => ({ ...info, shippingCity: e.target.value }))}
							/>
							<InputField
								label="State"
								id="shippingState"
								value={shippingInfo.shippingState}
								onChange={e => setShippingInfo(info => ({ ...info, shippingState: e.target.value }))}
							/>
							<InputField
								label="ZIP Code"
								id="shippingZip"
								value={shippingInfo.shippingZip}
								onChange={e => setShippingInfo(info => ({ ...info, shippingZip: e.target.value }))}
							/>
						</div>
						<button
							type="button"
							className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							onClick={async() => {
								const cartId = localStorage.getItem("cartId");
								
								const response = await fetch(`${BASE_URL}/cart/shipping?cartId=${cartId}`, {
									method: "GET",
									credentials: "include",
								});
								const data = await response.json();
								console.log('data', data);
							}}
						>
							Estimate Shipping Cost
						</button>
					</div>
					{/* Order summary */}
					<div className="mt-10 lg:mt-0">
						<h2 className="text-lg font-medium text-gray-900">Order summary</h2>
						<div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
							<h3 className="sr-only">Items in your cart</h3>
							<ul role="list" className="divide-y divide-gray-200">
								{remoteCart.map((product, idx) => (
									<li
										key={`${product.id}-${product.color}-${product.filamentType}-${idx}`}
										className="flex px-4 py-6 sm:px-6"
									>
										<div className="shrink-0 flex items-center justify-center w-20 h-20 rounded-md border border-gray-200 bg-white">
											<div
												className="block w-12 h-12 rounded-full border border-gray-300 shadow"
												style={{ backgroundColor: `#${product.color}` }}
												aria-label="Product color preview"
											/>
										</div>
										<div className="ml-4 flex-1 flex flex-col">
											<div className="flex justify-between">
												<div>
													<h4 className="text-sm font-medium text-gray-900">
														{product.name}
													</h4>
													<p className="mt-1 text-sm text-gray-500">
														Filament: {product.filamentType}
													</p>
												</div>
												<button
													type="button"
													className="text-red-500 text-xs underline ml-4"
													onClick={() => onRemove(product.id)}
												>
													Remove
												</button>
											</div>
											<div className="flex flex-1 items-end justify-between pt-2">
												<p className="mt-1 text-sm font-medium text-gray-900">
													${(product.price * product.quantity).toFixed(2)}
												</p>
												<div className="ml-4">
													<div className="relative w-full">
														<select
															id={`quantity-${product.id}`}
															name="quantity"
															aria-label="Quantity"
															className="w-full appearance-none rounded-md bg-white py-2 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
															value={product.quantity || 1}
															disabled={updatingIdx === idx}
															onChange={async (e) => onChangeQty(e, idx, product)}
														>
															{[...Array(10)].map((_, i) => (
																<option key={i + 1} value={i + 1}>
																	{i + 1}
																</option>
															))}
														</select>
														<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
															<ChevronDownIcon
																aria-hidden="true"
																className="size-5 text-gray-500 sm:size-4"
															/>
														</span>
													</div>
												</div>
											</div>
										</div>
									</li>
								))}
							</ul>
							{(() => {
								const validCart = Array.isArray(remoteCart)
									? remoteCart.filter(
											(item) =>
												typeof item.price === "number" &&
												typeof item.quantity === "number")
									: [];
								const subtotal = validCart.reduce(
									(sum, item) => sum + item.price * item.quantity,
									0
								);
								const shipping = validCart.length > 0 ? 5.0 : 0.0;
								const taxes = +(subtotal * 0.0862).toFixed(2); // Example: 8.62% tax
								const total = +(subtotal + shipping + taxes).toFixed(2);
								return (
									<dl className="space-y-6 border-t border-gray-200 px-4 py-6 sm:px-6">
										<div className="flex items-center justify-between">
											<dt className="text-sm">Subtotal</dt>
											<dd className="text-sm font-medium text-gray-900">
												${isNaN(subtotal) ? "0.00" : subtotal.toFixed(2)}
											</dd>
										</div>
										<div className="flex items-center justify-between">
											<dt className="text-sm">Shipping</dt>
											<dd className="text-sm font-medium text-gray-900">
												${isNaN(shipping) ? "0.00" : shipping.toFixed(2)}
											</dd>
										</div>
										<div className="flex items-center justify-between">
											<dt className="text-sm">Taxes</dt>
											<dd className="text-sm font-medium text-gray-900">
												${isNaN(taxes) ? "0.00" : taxes.toFixed(2)}
											</dd>
										</div>
										<div className="flex items-center justify-between border-t border-gray-200 pt-6">
											<dt className="text-base font-medium">Total</dt>
											<dd className="text-base font-medium text-gray-900">
												${isNaN(total) ? "0.00" : total.toFixed(2)}
											</dd>
										</div>
									</dl>
								);
							})()}
							<div className="border-t border-gray-200 px-4 py-6 sm:px-6">
								<button
									type="submit"
									className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
								>
									Confirm order
								</button>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

interface Profile {
	email: string;
	firstName: string;
	lastName: string;
	address: string;
	city: string;
	state: string;
	zipCode: string;
	country: string;
	phone: string;
}
