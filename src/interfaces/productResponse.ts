/**The response for the /list of products */
export interface ProductResponse {
  id: number;
  name: string;
  description: string;
  image: string;
  imageGallery: string[];
  stl: string;
  price: number;
  filamentType: string;
  skuNumber: string;
  color: string;
  categoryId?: number | null;
  size?: string;
  version?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProductListResponse {
  products: ProductResponse[];
  pagination: PaginationInfo;
}
