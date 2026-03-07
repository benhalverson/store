/**
 * The response for the /colors endpoint
 */
export interface ColorsResponse {
  name: string;
  provider: string;
  public: boolean;
  available: boolean;
  profile: string;
  color: string;
  hexValue: string;
  publicId: string;
}
