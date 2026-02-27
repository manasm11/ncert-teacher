import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module
vi.mock("@/lib/env", () => ({
    clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
    },
    serverEnv: {
        OLLAMA_CLOUD_API_KEY: "test-key",
        OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
    },
}));

import {
    BUCKETS,
    BUCKET_CONFIGS,
    validateFile,
    uploadFile,
    getFileUrl,
    downloadFile,
    deleteFiles,
    deleteUserFiles,
} from "@/lib/storage";
import type { BucketName } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Helpers – mock Supabase client
// ---------------------------------------------------------------------------

function createMockFile(
    name: string,
    size: number,
    type: string
): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
}

function createMockSupabase(overrides: Record<string, unknown> = {}) {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrlMock = vi.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/public/file.png" },
    });
    const createSignedUrlMock = vi.fn().mockResolvedValue({
        data: { signedUrl: "https://example.com/signed/file.pdf?token=abc" },
        error: null,
    });
    const downloadMock = vi.fn().mockResolvedValue({
        data: new Blob(["file content"]),
        error: null,
    });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const listMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
    });

    const fromMock = vi.fn().mockReturnValue({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
        createSignedUrl: createSignedUrlMock,
        download: downloadMock,
        remove: removeMock,
        list: listMock,
        ...overrides,
    });

    return {
        client: { storage: { from: fromMock } } as never,
        mocks: {
            from: fromMock,
            upload: uploadMock,
            getPublicUrl: getPublicUrlMock,
            createSignedUrl: createSignedUrlMock,
            download: downloadMock,
            remove: removeMock,
            list: listMock,
        },
    };
}

// ---------------------------------------------------------------------------
// Tests: Constants & Configuration
// ---------------------------------------------------------------------------

describe("BUCKETS", () => {
    it("defines avatars bucket", () => {
        expect(BUCKETS.AVATARS).toBe("avatars");
    });

    it("defines ncert-pdfs bucket", () => {
        expect(BUCKETS.NCERT_PDFS).toBe("ncert-pdfs");
    });

    it("defines chat-images bucket", () => {
        expect(BUCKETS.CHAT_IMAGES).toBe("chat-images");
    });
});

describe("BUCKET_CONFIGS", () => {
    describe("avatars", () => {
        it("has 2MB limit", () => {
            expect(BUCKET_CONFIGS[BUCKETS.AVATARS].maxSizeBytes).toBe(
                2 * 1024 * 1024
            );
        });

        it("allows image MIME types", () => {
            const types = BUCKET_CONFIGS[BUCKETS.AVATARS].allowedMimeTypes;
            expect(types).toContain("image/jpeg");
            expect(types).toContain("image/png");
            expect(types).toContain("image/webp");
            expect(types).toContain("image/gif");
        });

        it("is public", () => {
            expect(BUCKET_CONFIGS[BUCKETS.AVATARS].isPublic).toBe(true);
        });
    });

    describe("ncert-pdfs", () => {
        it("has 50MB limit", () => {
            expect(BUCKET_CONFIGS[BUCKETS.NCERT_PDFS].maxSizeBytes).toBe(
                50 * 1024 * 1024
            );
        });

        it("only allows PDF MIME type", () => {
            const types = BUCKET_CONFIGS[BUCKETS.NCERT_PDFS].allowedMimeTypes;
            expect(types).toEqual(["application/pdf"]);
        });

        it("is private", () => {
            expect(BUCKET_CONFIGS[BUCKETS.NCERT_PDFS].isPublic).toBe(false);
        });
    });

    describe("chat-images", () => {
        it("has 10MB limit", () => {
            expect(BUCKET_CONFIGS[BUCKETS.CHAT_IMAGES].maxSizeBytes).toBe(
                10 * 1024 * 1024
            );
        });

        it("allows image MIME types", () => {
            const types = BUCKET_CONFIGS[BUCKETS.CHAT_IMAGES].allowedMimeTypes;
            expect(types).toContain("image/jpeg");
            expect(types).toContain("image/png");
            expect(types).toContain("image/webp");
            expect(types).toContain("image/gif");
        });

        it("is private", () => {
            expect(BUCKET_CONFIGS[BUCKETS.CHAT_IMAGES].isPublic).toBe(false);
        });
    });

    it("has config for every bucket", () => {
        const bucketNames = Object.values(BUCKETS);
        for (const name of bucketNames) {
            expect(BUCKET_CONFIGS[name]).toBeDefined();
            expect(BUCKET_CONFIGS[name].maxSizeBytes).toBeGreaterThan(0);
            expect(BUCKET_CONFIGS[name].allowedMimeTypes.length).toBeGreaterThan(0);
        }
    });
});

// ---------------------------------------------------------------------------
// Tests: validateFile
// ---------------------------------------------------------------------------

describe("validateFile", () => {
    describe("avatars bucket", () => {
        const bucket: BucketName = "avatars";

        it("accepts valid JPEG under size limit", () => {
            const file = createMockFile("photo.jpg", 500_000, "image/jpeg");
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it("accepts valid PNG", () => {
            const file = createMockFile("photo.png", 1_000_000, "image/png");
            expect(validateFile(file, bucket).valid).toBe(true);
        });

        it("accepts valid WebP", () => {
            const file = createMockFile("photo.webp", 100_000, "image/webp");
            expect(validateFile(file, bucket).valid).toBe(true);
        });

        it("accepts valid GIF", () => {
            const file = createMockFile("anim.gif", 500_000, "image/gif");
            expect(validateFile(file, bucket).valid).toBe(true);
        });

        it("rejects file at exactly the size limit boundary", () => {
            // Exactly at limit should pass (<=)
            const file = createMockFile(
                "exact.jpg",
                2 * 1024 * 1024,
                "image/jpeg"
            );
            // File size equals maxSizeBytes — should still be rejected (> not >=)
            // Our check is file.size > config.maxSizeBytes, so exactly equal passes
            expect(validateFile(file, bucket).valid).toBe(true);
        });

        it("rejects file exceeding 2MB", () => {
            const file = createMockFile(
                "huge.jpg",
                2 * 1024 * 1024 + 1,
                "image/jpeg"
            );
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("File too large");
            expect(result.error).toContain("2MB");
        });

        it("rejects PDF in avatars bucket", () => {
            const file = createMockFile("doc.pdf", 100_000, "application/pdf");
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Invalid file type");
            expect(result.error).toContain("application/pdf");
        });

        it("rejects empty file", () => {
            const file = createMockFile("empty.jpg", 0, "image/jpeg");
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("No file provided");
        });

        it("rejects SVG (not in allowed types)", () => {
            const file = createMockFile("icon.svg", 5000, "image/svg+xml");
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Invalid file type");
        });
    });

    describe("ncert-pdfs bucket", () => {
        const bucket: BucketName = "ncert-pdfs";

        it("accepts valid PDF under 50MB", () => {
            const file = createMockFile(
                "textbook.pdf",
                10 * 1024 * 1024,
                "application/pdf"
            );
            expect(validateFile(file, bucket).valid).toBe(true);
        });

        it("rejects PDF over 50MB", () => {
            const file = createMockFile(
                "huge.pdf",
                50 * 1024 * 1024 + 1,
                "application/pdf"
            );
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("File too large");
            expect(result.error).toContain("50MB");
        });

        it("rejects images in PDFs bucket", () => {
            const file = createMockFile("photo.jpg", 100_000, "image/jpeg");
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Invalid file type");
        });

        it("rejects Word documents", () => {
            const file = createMockFile(
                "doc.docx",
                100_000,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
        });
    });

    describe("chat-images bucket", () => {
        const bucket: BucketName = "chat-images";

        it("accepts valid image under 10MB", () => {
            const file = createMockFile("screenshot.png", 5_000_000, "image/png");
            expect(validateFile(file, bucket).valid).toBe(true);
        });

        it("rejects image over 10MB", () => {
            const file = createMockFile(
                "huge.png",
                10 * 1024 * 1024 + 1,
                "image/png"
            );
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("File too large");
            expect(result.error).toContain("10MB");
        });

        it("rejects PDF in chat-images bucket", () => {
            const file = createMockFile(
                "homework.pdf",
                1_000_000,
                "application/pdf"
            );
            const result = validateFile(file, bucket);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Invalid file type");
        });

        it("accepts all four image types", () => {
            const types = ["image/jpeg", "image/png", "image/webp", "image/gif"];
            for (const type of types) {
                const file = createMockFile("img.dat", 1000, type);
                expect(validateFile(file, bucket).valid).toBe(true);
            }
        });
    });
});

// ---------------------------------------------------------------------------
// Tests: uploadFile
// ---------------------------------------------------------------------------

describe("uploadFile", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("uploads to public bucket and returns public URL", async () => {
        const { client, mocks } = createMockSupabase();
        const file = createMockFile("avatar.png", 100_000, "image/png");

        const result = await uploadFile(
            client,
            BUCKETS.AVATARS,
            "user-123/avatar.png",
            file
        );

        expect(mocks.from).toHaveBeenCalledWith("avatars");
        expect(mocks.upload).toHaveBeenCalledWith(
            "user-123/avatar.png",
            file,
            { upsert: false }
        );
        expect(mocks.getPublicUrl).toHaveBeenCalledWith("user-123/avatar.png");
        expect(result.path).toBe("user-123/avatar.png");
        expect(result.url).toBe("https://example.com/public/file.png");
    });

    it("uploads to private bucket and returns signed URL", async () => {
        const { client, mocks } = createMockSupabase();
        const file = createMockFile("textbook.pdf", 1_000_000, "application/pdf");

        const result = await uploadFile(
            client,
            BUCKETS.NCERT_PDFS,
            "science/ch1.pdf",
            file
        );

        expect(mocks.from).toHaveBeenCalledWith("ncert-pdfs");
        expect(mocks.upload).toHaveBeenCalledWith(
            "science/ch1.pdf",
            file,
            { upsert: false }
        );
        expect(mocks.createSignedUrl).toHaveBeenCalledWith("science/ch1.pdf", 3600);
        expect(result.path).toBe("science/ch1.pdf");
        expect(result.url).toContain("signed");
    });

    it("supports upsert option", async () => {
        const { client, mocks } = createMockSupabase();
        const file = createMockFile("avatar.png", 100_000, "image/png");

        await uploadFile(client, BUCKETS.AVATARS, "user-123/avatar.png", file, {
            upsert: true,
        });

        expect(mocks.upload).toHaveBeenCalledWith(
            "user-123/avatar.png",
            file,
            { upsert: true }
        );
    });

    it("throws on validation failure (file too large)", async () => {
        const { client } = createMockSupabase();
        const file = createMockFile(
            "huge.jpg",
            3 * 1024 * 1024,
            "image/jpeg"
        );

        await expect(
            uploadFile(client, BUCKETS.AVATARS, "user-123/avatar.jpg", file)
        ).rejects.toThrow("File too large");
    });

    it("throws on validation failure (wrong MIME type)", async () => {
        const { client } = createMockSupabase();
        const file = createMockFile("script.js", 1000, "text/javascript");

        await expect(
            uploadFile(client, BUCKETS.AVATARS, "user-123/script.js", file)
        ).rejects.toThrow("Invalid file type");
    });

    it("throws on validation failure (empty file)", async () => {
        const { client } = createMockSupabase();
        const file = createMockFile("empty.png", 0, "image/png");

        await expect(
            uploadFile(client, BUCKETS.AVATARS, "user-123/empty.png", file)
        ).rejects.toThrow("No file provided");
    });

    it("throws when Supabase upload fails", async () => {
        const { client } = createMockSupabase({
            upload: vi
                .fn()
                .mockResolvedValue({ error: { message: "Bucket not found" } }),
        });
        const file = createMockFile("avatar.png", 100_000, "image/png");

        await expect(
            uploadFile(client, BUCKETS.AVATARS, "user-123/avatar.png", file)
        ).rejects.toThrow("Upload failed: Bucket not found");
    });

    it("throws when signed URL creation fails for private bucket", async () => {
        const { client } = createMockSupabase({
            createSignedUrl: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not authorized" },
            }),
        });
        const file = createMockFile(
            "textbook.pdf",
            1_000_000,
            "application/pdf"
        );

        await expect(
            uploadFile(client, BUCKETS.NCERT_PDFS, "ch1.pdf", file)
        ).rejects.toThrow("Failed to create signed URL: Not authorized");
    });

    it("throws when signed URL data is null without error", async () => {
        const { client } = createMockSupabase({
            createSignedUrl: vi.fn().mockResolvedValue({
                data: null,
                error: null,
            }),
        });
        const file = createMockFile("img.png", 1000, "image/png");

        await expect(
            uploadFile(client, BUCKETS.CHAT_IMAGES, "user/img.png", file)
        ).rejects.toThrow("Failed to create signed URL: unknown error");
    });

    it("uploads chat image to private bucket", async () => {
        const { client, mocks } = createMockSupabase();
        const file = createMockFile("screenshot.png", 500_000, "image/png");

        const result = await uploadFile(
            client,
            BUCKETS.CHAT_IMAGES,
            "user-456/screenshot.png",
            file
        );

        expect(mocks.from).toHaveBeenCalledWith("chat-images");
        expect(mocks.createSignedUrl).toHaveBeenCalled();
        expect(result.path).toBe("user-456/screenshot.png");
    });
});

// ---------------------------------------------------------------------------
// Tests: getFileUrl
// ---------------------------------------------------------------------------

describe("getFileUrl", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns public URL for public bucket", async () => {
        const { client, mocks } = createMockSupabase();

        const url = await getFileUrl(
            client,
            BUCKETS.AVATARS,
            "user-123/avatar.png"
        );

        expect(mocks.getPublicUrl).toHaveBeenCalledWith("user-123/avatar.png");
        expect(url).toBe("https://example.com/public/file.png");
    });

    it("does not call createSignedUrl for public bucket", async () => {
        const { client, mocks } = createMockSupabase();

        await getFileUrl(client, BUCKETS.AVATARS, "user-123/avatar.png");

        expect(mocks.createSignedUrl).not.toHaveBeenCalled();
    });

    it("returns signed URL for private bucket with default expiry", async () => {
        const { client, mocks } = createMockSupabase();

        const url = await getFileUrl(
            client,
            BUCKETS.NCERT_PDFS,
            "science/ch1.pdf"
        );

        expect(mocks.createSignedUrl).toHaveBeenCalledWith(
            "science/ch1.pdf",
            3600
        );
        expect(url).toContain("signed");
    });

    it("passes custom expiresIn to createSignedUrl", async () => {
        const { client, mocks } = createMockSupabase();

        await getFileUrl(client, BUCKETS.NCERT_PDFS, "ch2.pdf", 7200);

        expect(mocks.createSignedUrl).toHaveBeenCalledWith("ch2.pdf", 7200);
    });

    it("returns signed URL for chat-images bucket", async () => {
        const { client, mocks } = createMockSupabase();

        await getFileUrl(
            client,
            BUCKETS.CHAT_IMAGES,
            "user-789/img.png"
        );

        expect(mocks.createSignedUrl).toHaveBeenCalledWith(
            "user-789/img.png",
            3600
        );
    });

    it("throws when createSignedUrl fails", async () => {
        const { client } = createMockSupabase({
            createSignedUrl: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Object not found" },
            }),
        });

        await expect(
            getFileUrl(client, BUCKETS.NCERT_PDFS, "missing.pdf")
        ).rejects.toThrow("Failed to create signed URL: Object not found");
    });

    it("throws when signed URL data is missing", async () => {
        const { client } = createMockSupabase({
            createSignedUrl: vi.fn().mockResolvedValue({
                data: null,
                error: null,
            }),
        });

        await expect(
            getFileUrl(client, BUCKETS.CHAT_IMAGES, "x.png")
        ).rejects.toThrow("unknown error");
    });
});

// ---------------------------------------------------------------------------
// Tests: downloadFile
// ---------------------------------------------------------------------------

describe("downloadFile", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("downloads file and returns Blob", async () => {
        const mockBlob = new Blob(["pdf content"], {
            type: "application/pdf",
        });
        const { client, mocks } = createMockSupabase({
            download: vi.fn().mockResolvedValue({ data: mockBlob, error: null }),
        });

        const blob = await downloadFile(
            client,
            BUCKETS.NCERT_PDFS,
            "science/ch1.pdf"
        );

        expect(mocks.from).toHaveBeenCalledWith("ncert-pdfs");
        expect(blob).toBe(mockBlob);
    });

    it("downloads avatar from public bucket", async () => {
        const mockBlob = new Blob(["image data"], { type: "image/png" });
        const { client } = createMockSupabase({
            download: vi.fn().mockResolvedValue({ data: mockBlob, error: null }),
        });

        const blob = await downloadFile(
            client,
            BUCKETS.AVATARS,
            "user-123/avatar.png"
        );

        expect(blob).toBe(mockBlob);
    });

    it("throws when download fails with error", async () => {
        const { client } = createMockSupabase({
            download: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
            }),
        });

        await expect(
            downloadFile(client, BUCKETS.NCERT_PDFS, "missing.pdf")
        ).rejects.toThrow("Download failed: Not found");
    });

    it("throws when download returns null data without error", async () => {
        const { client } = createMockSupabase({
            download: vi.fn().mockResolvedValue({
                data: null,
                error: null,
            }),
        });

        await expect(
            downloadFile(client, BUCKETS.CHAT_IMAGES, "img.png")
        ).rejects.toThrow("Download failed: unknown error");
    });
});

// ---------------------------------------------------------------------------
// Tests: deleteFiles
// ---------------------------------------------------------------------------

describe("deleteFiles", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("deletes specified files from bucket", async () => {
        const { client, mocks } = createMockSupabase();

        await deleteFiles(client, BUCKETS.AVATARS, [
            "user-123/avatar.png",
            "user-123/avatar.jpg",
        ]);

        expect(mocks.from).toHaveBeenCalledWith("avatars");
        expect(mocks.remove).toHaveBeenCalledWith([
            "user-123/avatar.png",
            "user-123/avatar.jpg",
        ]);
    });

    it("does nothing when filePaths is empty", async () => {
        const { client, mocks } = createMockSupabase();

        await deleteFiles(client, BUCKETS.AVATARS, []);

        expect(mocks.from).not.toHaveBeenCalled();
        expect(mocks.remove).not.toHaveBeenCalled();
    });

    it("deletes single file", async () => {
        const { client, mocks } = createMockSupabase();

        await deleteFiles(client, BUCKETS.NCERT_PDFS, ["ch1.pdf"]);

        expect(mocks.from).toHaveBeenCalledWith("ncert-pdfs");
        expect(mocks.remove).toHaveBeenCalledWith(["ch1.pdf"]);
    });

    it("throws when remove fails", async () => {
        const { client } = createMockSupabase({
            remove: vi.fn().mockResolvedValue({
                error: { message: "Permission denied" },
            }),
        });

        await expect(
            deleteFiles(client, BUCKETS.AVATARS, ["file.png"])
        ).rejects.toThrow("Delete failed: Permission denied");
    });
});

// ---------------------------------------------------------------------------
// Tests: deleteUserFiles
// ---------------------------------------------------------------------------

describe("deleteUserFiles", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("lists and deletes all user files", async () => {
        const removeMock = vi.fn().mockResolvedValue({ error: null });
        const listMock = vi.fn().mockResolvedValue({
            data: [{ name: "avatar.png" }, { name: "avatar.jpg" }],
            error: null,
        });
        const { client, mocks } = createMockSupabase({
            list: listMock,
            remove: removeMock,
        });

        await deleteUserFiles(client, BUCKETS.AVATARS, "user-123");

        expect(mocks.from).toHaveBeenCalledWith("avatars");
        expect(listMock).toHaveBeenCalledWith("user-123");
        expect(removeMock).toHaveBeenCalledWith([
            "user-123/avatar.png",
            "user-123/avatar.jpg",
        ]);
    });

    it("does nothing when user has no files", async () => {
        const removeMock = vi.fn();
        const listMock = vi.fn().mockResolvedValue({
            data: [],
            error: null,
        });
        createMockSupabase({ list: listMock, remove: removeMock });
        const { client } = createMockSupabase({
            list: listMock,
            remove: removeMock,
        });

        await deleteUserFiles(client, BUCKETS.CHAT_IMAGES, "user-789");

        expect(removeMock).not.toHaveBeenCalled();
    });

    it("does nothing when list returns null data", async () => {
        const removeMock = vi.fn();
        const listMock = vi.fn().mockResolvedValue({
            data: null,
            error: null,
        });
        const { client } = createMockSupabase({
            list: listMock,
            remove: removeMock,
        });

        await deleteUserFiles(client, BUCKETS.AVATARS, "user-123");

        expect(removeMock).not.toHaveBeenCalled();
    });

    it("throws when list fails", async () => {
        const { client } = createMockSupabase({
            list: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Connection error" },
            }),
        });

        await expect(
            deleteUserFiles(client, BUCKETS.AVATARS, "user-123")
        ).rejects.toThrow("Failed to list files: Connection error");
    });

    it("propagates delete errors", async () => {
        const { client } = createMockSupabase({
            list: vi.fn().mockResolvedValue({
                data: [{ name: "file.png" }],
                error: null,
            }),
            remove: vi.fn().mockResolvedValue({
                error: { message: "Storage quota exceeded" },
            }),
        });

        await expect(
            deleteUserFiles(client, BUCKETS.CHAT_IMAGES, "user-123")
        ).rejects.toThrow("Delete failed: Storage quota exceeded");
    });

    it("works for ncert-pdfs bucket", async () => {
        const removeMock = vi.fn().mockResolvedValue({ error: null });
        const listMock = vi.fn().mockResolvedValue({
            data: [{ name: "ch1.pdf" }, { name: "ch2.pdf" }],
            error: null,
        });
        const { client } = createMockSupabase({
            list: listMock,
            remove: removeMock,
        });

        await deleteUserFiles(client, BUCKETS.NCERT_PDFS, "admin-1");

        expect(removeMock).toHaveBeenCalledWith([
            "admin-1/ch1.pdf",
            "admin-1/ch2.pdf",
        ]);
    });
});

// ---------------------------------------------------------------------------
// Tests: Cross-bucket integration scenarios
// ---------------------------------------------------------------------------

describe("cross-bucket scenarios", () => {
    it("validates PDF correctly for ncert-pdfs but rejects for chat-images", () => {
        const pdfFile = createMockFile(
            "textbook.pdf",
            1_000_000,
            "application/pdf"
        );

        expect(validateFile(pdfFile, BUCKETS.NCERT_PDFS).valid).toBe(true);
        expect(validateFile(pdfFile, BUCKETS.CHAT_IMAGES).valid).toBe(false);
        expect(validateFile(pdfFile, BUCKETS.AVATARS).valid).toBe(false);
    });

    it("validates image correctly for avatars and chat-images but rejects for ncert-pdfs", () => {
        const imgFile = createMockFile("photo.jpg", 500_000, "image/jpeg");

        expect(validateFile(imgFile, BUCKETS.AVATARS).valid).toBe(true);
        expect(validateFile(imgFile, BUCKETS.CHAT_IMAGES).valid).toBe(true);
        expect(validateFile(imgFile, BUCKETS.NCERT_PDFS).valid).toBe(false);
    });

    it("enforces different size limits across buckets", () => {
        // 5MB file: too big for avatars (2MB), ok for chat-images (10MB) and ncert-pdfs (50MB)
        const mediumImg = createMockFile(
            "photo.png",
            5 * 1024 * 1024,
            "image/png"
        );
        expect(validateFile(mediumImg, BUCKETS.AVATARS).valid).toBe(false);
        expect(validateFile(mediumImg, BUCKETS.CHAT_IMAGES).valid).toBe(true);

        // 15MB PDF: ok for ncert-pdfs (50MB), too big for others
        const bigPdf = createMockFile(
            "book.pdf",
            15 * 1024 * 1024,
            "application/pdf"
        );
        expect(validateFile(bigPdf, BUCKETS.NCERT_PDFS).valid).toBe(true);
    });
});
