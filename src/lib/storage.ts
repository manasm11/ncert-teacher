import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Bucket definitions
// ---------------------------------------------------------------------------

export const BUCKETS = {
    AVATARS: "avatars",
    NCERT_PDFS: "ncert-pdfs",
    CHAT_IMAGES: "chat-images",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

// ---------------------------------------------------------------------------
// Bucket configuration (size limits + allowed MIME types)
// ---------------------------------------------------------------------------

export interface BucketConfig {
    maxSizeBytes: number;
    allowedMimeTypes: string[];
    isPublic: boolean;
}

export const BUCKET_CONFIGS: Record<BucketName, BucketConfig> = {
    [BUCKETS.AVATARS]: {
        maxSizeBytes: 2 * 1024 * 1024, // 2MB
        allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ],
        isPublic: true,
    },
    [BUCKETS.NCERT_PDFS]: {
        maxSizeBytes: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ["application/pdf"],
        isPublic: false,
    },
    [BUCKETS.CHAT_IMAGES]: {
        maxSizeBytes: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ],
        isPublic: false,
    },
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateFile(
    file: File,
    bucket: BucketName
): ValidationResult {
    const config = BUCKET_CONFIGS[bucket];

    if (!file || file.size === 0) {
        return { valid: false, error: "No file provided" };
    }

    if (file.size > config.maxSizeBytes) {
        const maxMB = Math.round(config.maxSizeBytes / (1024 * 1024));
        return {
            valid: false,
            error: `File too large. Maximum size is ${maxMB}MB`,
        };
    }

    if (!config.allowedMimeTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type "${file.type}". Allowed: ${config.allowedMimeTypes.join(", ")}`,
        };
    }

    return { valid: true };
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface UploadResult {
    path: string;
    url: string;
}

/**
 * Upload a file to a Supabase storage bucket.
 *
 * @param supabase  - authenticated Supabase client
 * @param bucket    - target bucket name
 * @param filePath  - object path inside the bucket (e.g. `<userId>/avatar.png`)
 * @param file      - the File/Blob to upload
 * @param options   - extra options (upsert)
 */
export async function uploadFile(
    supabase: SupabaseClient,
    bucket: BucketName,
    filePath: string,
    file: File,
    options?: { upsert?: boolean }
): Promise<UploadResult> {
    const validation = validateFile(file, bucket);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: options?.upsert ?? false });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const config = BUCKET_CONFIGS[bucket];
    let url: string;

    if (config.isPublic) {
        const {
            data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);
        url = publicUrl;
    } else {
        const { data, error: signError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(filePath, 3600); // 1 hour

        if (signError || !data?.signedUrl) {
            throw new Error(
                `Failed to create signed URL: ${signError?.message ?? "unknown error"}`
            );
        }
        url = data.signedUrl;
    }

    return { path: filePath, url };
}

// ---------------------------------------------------------------------------
// Download / get URL
// ---------------------------------------------------------------------------

/**
 * Get a URL for a file. Public buckets return a permanent public URL;
 * private buckets return a signed URL valid for `expiresIn` seconds.
 */
export async function getFileUrl(
    supabase: SupabaseClient,
    bucket: BucketName,
    filePath: string,
    expiresIn = 3600
): Promise<string> {
    const config = BUCKET_CONFIGS[bucket];

    if (config.isPublic) {
        const {
            data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return publicUrl;
    }

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
        throw new Error(
            `Failed to create signed URL: ${error?.message ?? "unknown error"}`
        );
    }

    return data.signedUrl;
}

/**
 * Download file data as a Blob.
 */
export async function downloadFile(
    supabase: SupabaseClient,
    bucket: BucketName,
    filePath: string
): Promise<Blob> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

    if (error || !data) {
        throw new Error(
            `Download failed: ${error?.message ?? "unknown error"}`
        );
    }

    return data;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Delete one or more files from a bucket.
 */
export async function deleteFiles(
    supabase: SupabaseClient,
    bucket: BucketName,
    filePaths: string[]
): Promise<void> {
    if (filePaths.length === 0) return;

    const { error } = await supabase.storage.from(bucket).remove(filePaths);

    if (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
}

/**
 * Delete all files in a user's folder within a bucket.
 */
export async function deleteUserFiles(
    supabase: SupabaseClient,
    bucket: BucketName,
    userId: string
): Promise<void> {
    const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(userId);

    if (listError) {
        throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (!files || files.length === 0) return;

    const paths = files.map((f) => `${userId}/${f.name}`);
    await deleteFiles(supabase, bucket, paths);
}
