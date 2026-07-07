import {
  formatWebAuthnRpIdError,
  getWebAuthnRpId,
  validateWebAuthnOptionsRpId,
  validateWebAuthnRpId,
} from "./webauthn";

describe("WebAuthn RP ID validation", () => {
  it("accepts an RP ID that matches the current hostname", () => {
    expect(
      validateWebAuthnRpId(
        "rc-store.benhalverson.dev",
        "rc-store.benhalverson.dev",
      ),
    ).toMatchObject({ isValid: true, rpId: "rc-store.benhalverson.dev" });
  });

  it("accepts a parent-domain RP ID", () => {
    expect(
      validateWebAuthnRpId("benhalverson.dev", "rc-store.benhalverson.dev"),
    ).toMatchObject({ isValid: true, rpId: "benhalverson.dev" });
  });

  it("rejects localhost when the current host is deployed", () => {
    expect(
      validateWebAuthnRpId("localhost", "rc-store.benhalverson.dev"),
    ).toMatchObject({
      isValid: false,
      rpId: "localhost",
      message: formatWebAuthnRpIdError({
        rpId: "localhost",
        currentHostname: "rc-store.benhalverson.dev",
      }),
    });
  });

  it("rejects URL-shaped RP IDs", () => {
    expect(
      validateWebAuthnRpId(
        "https://rc-store.benhalverson.dev",
        "rc-store.benhalverson.dev",
      ),
    ).toMatchObject({
      isValid: false,
      rpId: "https://rc-store.benhalverson.dev",
    });
  });

  it("extracts RP ID from either auth or registration payloads", () => {
    expect(getWebAuthnRpId({ rpId: "example.com" })).toBe("example.com");
    expect(getWebAuthnRpId({ rp: { id: "example.com" } })).toBe(
      "example.com",
    );
  });

  it("validates nested registration RP IDs", () => {
    expect(
      validateWebAuthnOptionsRpId(
        { rp: { id: "https://rc-store.benhalverson.dev" } },
        "rc-store.benhalverson.dev",
      ),
    ).toMatchObject({
      isValid: false,
      rpId: "https://rc-store.benhalverson.dev",
    });
  });
});