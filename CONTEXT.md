# Storefront

The customer-facing commerce context for browsing printable products, checking out, and managing post-purchase self-service.

## Language

**Storefront**:
The customer-facing shopping experience for product discovery, cart, checkout, account management, and order self-service.
_Avoid_: Admin console, catalog management UI, back office

**Customer**:
A person who uses the storefront to buy printed products and manage their own account or orders.
_Avoid_: Buyer, admin, operator

**Order History**:
The customer's list of previously placed orders, shown with buyer-safe order, item, payment, and fulfillment status.
_Avoid_: Admin orders, fulfillment queue

**Order Detail**:
A read-only customer view of one order's items, totals, lifecycle status, and fulfillment information.
_Avoid_: Cancellation workflow, refund workflow, admin order operations

**Category Filter**:
A URL-addressable, single-select product discovery control that narrows or browses the storefront catalog by category across the full catalog, not only the currently visible page. Category names come from the category list exposed by the API.
_Avoid_: Category management, admin taxonomy

**Uncategorized Product**:
A temporary catalog state for a product without a category assignment; it may appear in the all-products view but should not become a customer-facing category.
_Avoid_: Uncategorized category

**Account Profile**:
The customer's identity, contact, shipping, and security settings.
_Avoid_: Order history, admin profile

**Account Security**:
The customer's authentication and credential management area, including passkeys.
_Avoid_: Profile details, order history

**Protected Customer Area**:
A storefront area available only to signed-in customers, where sign-in should preserve the customer's intended destination.
_Avoid_: Public catalog, admin area
