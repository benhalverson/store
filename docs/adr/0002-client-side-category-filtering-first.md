# Start category filtering client-side

The first storefront category filter will fetch the current small product catalog with a high page limit, keep the selected category in the URL, and filter/paginate the loaded products client-side. This avoids adding backend filtering before the catalog needs it, while preserving a UI shape that can later call an API-backed `categoryId` filter if the catalog grows.

If loading categories fails, the product catalog should still render with the default all-products view and report the category failure as a non-blocking toast.
