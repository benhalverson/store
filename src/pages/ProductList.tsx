import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import { Pagination } from "../components/Pagination";
import { BASE_URL } from "../config";
import type { CategoryResponse } from "../interfaces/category";
import type {
  ProductListResponse,
  ProductResponse,
} from "../interfaces/productResponse";

const CATALOG_FETCH_LIMIT = 100;
const DEFAULT_PAGE_SIZE = 5;

function parseCategoryId(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  const selectedCategoryId = parseCategoryId(searchParams.get("categoryId"));

  const getData = async () => {
    setLoading(true);
    const fetchProducts = async () => {
      const response = await fetch(
        `${BASE_URL}/products?page=1&limit=${CATALOG_FETCH_LIMIT}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch products (${response.status})`);
      }
      const data = (await response.json()) as ProductListResponse;
      return data.products;
    };

    const fetchCategories = async () => {
      const response = await fetch(`${BASE_URL}/categories`);
      if (!response.ok) {
        throw new Error(`Failed to fetch categories (${response.status})`);
      }
      return (await response.json()) as CategoryResponse[];
    };

    try {
      const [productResult, categoryResult] = await Promise.allSettled([
        fetchProducts(),
        fetchCategories(),
      ]);

      if (productResult.status === "fulfilled") {
        setCatalog(productResult.value);
      } else {
        console.error("error", productResult.reason);
        setCatalog([]);
      }

      if (categoryResult.status === "fulfilled") {
        setCategories(categoryResult.value);
      } else {
        console.error("error", categoryResult.reason);
        toast.error("Category filters are unavailable right now.");
        setCategories([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === null) return catalog;
    return catalog.filter(
      (product) => product.categoryId === selectedCategoryId,
    );
  }, [catalog, selectedCategoryId]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const visibleProducts = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredProducts.slice(start, start + limit);
  }, [currentPage, filteredProducts, limit]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleCategoryChange = (categoryId: number | null) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (categoryId === null) {
      nextSearchParams.delete("categoryId");
    } else {
      nextSearchParams.set("categoryId", String(categoryId));
    }

    setPage(1);
    setSearchParams(nextSearchParams);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: TODO: useEventEffect in 19
  useEffect(() => {
    getData();
  }, []);

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold">Products</h1>

        {loading ? (
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={selectedCategoryId === null}
                onClick={() => handleCategoryChange(null)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategoryId === null
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
                }`}>
                All
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.categoryId}
                  aria-pressed={selectedCategoryId === category.categoryId}
                  onClick={() => handleCategoryChange(category.categoryId)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedCategoryId === category.categoryId
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
                  }`}>
                  {category.categoryName}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {visibleProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md flex flex-col h-full">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover object-center rounded-t-lg"
                  />
                  <div className="p-4 flex flex-col flex-grow">
                    <h2 className="text-xl font-semibold">{product.name}</h2>
                    <p className="text-gray-500 mt-2 flex-grow">
                      {product.description}
                    </p>
                    <p className="text-gray-500 mt-2">${product.price}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {product.skuNumber}
                      </span>
                      <span
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: product.color }}
                        title={`Color: ${product.color}`}></span>
                    </div>
                    <Link
                      to={`/product/${product.id}`}
                      className="block bg-blue-500 hover:bg-blue-400 text-white font-semibold text-center rounded-lg px-4 py-2 mt-4">
                      View Product
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {totalItems === 0 ? (
              <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
                No products found.
              </div>
            ) : (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                limit={limit}
                hasNextPage={currentPage < totalPages}
                hasPreviousPage={currentPage > 1}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProductList;
