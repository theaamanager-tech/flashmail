import { getServerEnv } from "./env.server";

export interface DnsVerificationResult {
  verified: boolean;
  reason?: string;
}

/**
 * Verify that the given domain is controlled by the user.
 * In mock mode (ENABLE_MOCK_DNS_VERIFICATION=true) the check always succeeds.
 * In production this should perform real DNS resolution against required records.
 */
export async function verifyDomainDns(
  domain: string,
  expectedToken?: string,
): Promise<DnsVerificationResult> {
  const env = getServerEnv();

  if (env.ENABLE_MOCK_DNS_VERIFICATION) {
    return { verified: true, reason: "mock verification enabled" };
  }

  // Production placeholder: implement real DNS TXT/MX checks here.
  // Recommended integration: Cloudflare DNS API or public DNS over HTTPS.
  // Example approach:
  //   1. Generate a unique verification token per domain.
  //   2. Ask the user to create a TXT record at _flashmail.<domain> with the token.
  //   3. Query public DNS (e.g., Google/Cloudflare DoH) for that TXT record.
  //   4. Compare the returned token with the expected token in constant time.
  // Do NOT expose Cloudflare API credentials to the browser.
  return {
    verified: false,
    reason:
      "Production DNS verification is not yet configured. Set ENABLE_MOCK_DNS_VERIFICATION=true for development or implement a real DNS resolver.",
  };
}

/**
 * Generate a verification token for a domain. Store this server-side and require
 * the user to publish it in DNS before verification.
 */
export function generateDomainVerificationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
