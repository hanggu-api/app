import { Client } from "minio";
import dotenv from "dotenv";

dotenv.config();

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    console.warn("[WARNING] Cloudflare R2 credentials not fully configured in .env");
}

export const r2Client = new Client({
    endPoint: `${r2AccountId}.r2.cloudflarestorage.com`,
    useSSL: true,
    accessKey: r2AccessKeyId || "",
    secretKey: r2SecretAccessKey || "",
    region: "auto"
});

export const R2_BUCKET = process.env.R2_BUCKET || "conserta-media";

/**
 * Generates a presigned URL for uploading a file to Cloudflare R2.
 * @param key The destination path/filename in the bucket.
 * @param expiry Seconds until the URL expires (default 1 hour).
 */
export async function getPresignedUploadUrl(key: string, expiry: number = 3600): Promise<string> {
    // MinIO presignedPutObject(bucket, key, expiry) returns a Promise if no callback is provided
    return await r2Client.presignedPutObject(R2_BUCKET, key, expiry);
}
