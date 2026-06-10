/**
 * Amazon Bedrock LLM Integration
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides an invokeLLM-compatible function that calls Amazon Bedrock
 * (Claude 3.5 Sonnet) instead of OpenAI. Used when AWS credentials are
 * configured via environment variables.
 *
 * Bedrock Converse API: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html
 * Uses AWS Signature Version 4 (SigV4) for authentication.
 */

import { createHmac, createHash } from "crypto";
import { ENV } from "./env.js";

// ── AWS SigV4 Signing ─────────────────────────────────────────────────────────

function hmacSHA256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSHA256("AWS4" + secretKey, dateStamp);
  const kRegion = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  const kSigning = hmacSHA256(kService, "aws4_request");
  return kSigning;
}

function signRequest(
  method: string,
  host: string,
  path: string,
  body: string,
  region: string,
  service: string,
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken?: string
): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256Hex(body);

  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    sessionToken ? `x-amz-security-token:${sessionToken}` : "",
  ]
    .filter(Boolean)
    .join("\n") + "\n";

  const signedHeadersList = [
    "content-type",
    "host",
    "x-amz-content-sha256",
    "x-amz-date",
    sessionToken ? "x-amz-security-token" : "",
  ]
    .filter(Boolean)
    .join(";");

  const canonicalRequest = [
    method,
    path,
    "", // query string
    canonicalHeaders,
    signedHeadersList,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: authorizationHeader,
  };
  if (sessionToken) {
    headers["x-amz-security-token"] = sessionToken;
  }
  return headers;
}

// ── Bedrock Converse API ──────────────────────────────────────────────────────

export function isBedrockConfigured(): boolean {
  return !!(ENV.awsAccessKeyId && ENV.awsSecretAccessKey);
}

export async function invokeBedrock(params: {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}): Promise<string> {
  const { messages, systemPrompt } = params;
  const region = ENV.awsRegion;
  const modelId = ENV.bedrockModelId;
  const host = `bedrock-runtime.${region}.amazonaws.com`;
  const path = `/model/${encodeURIComponent(modelId)}/converse`;

  // Build Bedrock Converse API payload
  const bedrockMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: [{ text: m.content }],
    }));

  const payload: Record<string, unknown> = {
    messages: bedrockMessages,
    inferenceConfig: {
      maxTokens: 4096,
      temperature: 0.1,
    },
  };

  // Add system prompt if provided
  const sysContent = systemPrompt || messages.find((m) => m.role === "system")?.content;
  if (sysContent) {
    payload.system = [{ text: sysContent }];
  }

  const bodyStr = JSON.stringify(payload);
  const headers = signRequest(
    "POST",
    host,
    path,
    bodyStr,
    region,
    "bedrock",
    ENV.awsAccessKeyId,
    ENV.awsSecretAccessKey,
    ENV.awsSessionToken || undefined
  );

  const response = await fetch(`https://${host}${path}`, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bedrock invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  const result = (await response.json()) as {
    output?: { message?: { content?: Array<{ text?: string }> } };
  };

  const text = result.output?.message?.content?.[0]?.text ?? "";
  return text;
}
