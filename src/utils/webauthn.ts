export const base64urlToUint8Array = (input: string): Uint8Array => {
  const base64 = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};

export const bufferToBase64 = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

export const bufferToBase64url = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

interface WebAuthnRpEntity {
  id?: string;
}

interface WebAuthnRpIdCarrier {
  rpId?: string;
  rp?: WebAuthnRpEntity;
}

interface WebAuthnRpIdValidationResult {
  isValid: boolean;
  message?: string;
  rpId?: string;
  currentHostname: string;
}

const getCurrentHostname = () =>
  typeof window === "undefined" ? "" : window.location.hostname.toLowerCase();

const hasInvalidRpIdSyntax = (rpId: string) =>
  rpId.includes("://") ||
  rpId.includes("/") ||
  rpId.includes("?") ||
  rpId.includes("#") ||
  rpId.includes(":");

export const getWebAuthnRpId = ({ rpId, rp }: WebAuthnRpIdCarrier) => {
  if (typeof rpId === "string" && rpId.trim()) {
    return rpId.trim().toLowerCase();
  }

  if (typeof rp?.id === "string" && rp.id.trim()) {
    return rp.id.trim().toLowerCase();
  }

  return undefined;
};

export const formatWebAuthnRpIdError = ({
  rpId,
  currentHostname,
}: {
  rpId: string;
  currentHostname: string;
}) =>
  `Passkeys are unavailable on this deployment. The server returned RP ID "${rpId}" for "${currentHostname}". Expected the RP ID to match the current hostname or one of its parent domains.`;

export const validateWebAuthnRpId = (
  rpId: string | undefined,
  currentHostname = getCurrentHostname(),
): WebAuthnRpIdValidationResult => {
  if (!rpId) {
    return { isValid: true, currentHostname };
  }

  const normalizedRpId = rpId.trim().toLowerCase();
  const normalizedHostname = currentHostname.trim().toLowerCase();

  if (!normalizedRpId) {
    return { isValid: true, currentHostname: normalizedHostname };
  }

  if (hasInvalidRpIdSyntax(normalizedRpId)) {
    return {
      isValid: false,
      rpId: normalizedRpId,
      currentHostname: normalizedHostname,
      message: formatWebAuthnRpIdError({
        rpId: normalizedRpId,
        currentHostname: normalizedHostname,
      }),
    };
  }

  const matchesCurrentHost =
    normalizedHostname === normalizedRpId ||
    normalizedHostname.endsWith(`.${normalizedRpId}`);

  if (!matchesCurrentHost) {
    return {
      isValid: false,
      rpId: normalizedRpId,
      currentHostname: normalizedHostname,
      message: formatWebAuthnRpIdError({
        rpId: normalizedRpId,
        currentHostname: normalizedHostname,
      }),
    };
  }

  return {
    isValid: true,
    rpId: normalizedRpId,
    currentHostname: normalizedHostname,
  };
};

export const validateWebAuthnOptionsRpId = (
  options: WebAuthnRpIdCarrier,
  currentHostname = getCurrentHostname(),
) => validateWebAuthnRpId(getWebAuthnRpId(options), currentHostname);
