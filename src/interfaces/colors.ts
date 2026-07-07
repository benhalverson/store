/**
 * The color data returned in the /v2/colors response envelope.
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
