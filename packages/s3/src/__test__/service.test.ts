import type { ApiConfig } from "@prefabs.tech/fastify-config";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { File } from "../types/file";

import { ERROR_CODES } from "../constants";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockS3 } = vi.hoisted(() => ({
  mockS3: {
    bucket: "" as string,
    delete: vi.fn(),
    generatePresignedUrl: vi.fn(),
    get: vi.fn(),
    getObjects: vi.fn(),
    isFileExists: vi.fn(),
    upload: vi.fn(),
  },
}));

vi.mock("../utils/s3Client", () => ({
  default: vi.fn(() => mockS3),
}));

vi.mock("@prefabs.tech/fastify-slonik", () => {
  class MockBaseService {
    config: ApiConfig;
    constructor(config: ApiConfig, ...arguments_: unknown[]) {
      void arguments_;
      this.config = config;
    }
    async create(...arguments_: unknown[]): Promise<unknown> {
      void arguments_;
      return undefined;
    }
    async delete(...arguments_: unknown[]): Promise<unknown> {
      void arguments_;
      return undefined;
    }
    async findById(...arguments_: unknown[]): Promise<unknown> {
      void arguments_;
      return undefined;
    }
  }
  class MockDefaultSqlFactory {
    config: ApiConfig;
    get table() {
      return "files";
    }
    constructor(config: ApiConfig) {
      this.config = config;
    }
  }
  return {
    BaseService: MockBaseService,
    DefaultSqlFactory: MockDefaultSqlFactory,
    formatDate: (d: Date) => d.toISOString(),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildConfig = (s3Overrides: Record<string, unknown> = {}): ApiConfig =>
  ({
    s3: {
      bucket: "test-bucket",
      clientConfig: {},
      ...s3Overrides,
    },
  }) as unknown as ApiConfig;

const mockFile: File = {
  bucket: "test-bucket",
  createdAt: Date.now(),
  id: 1,
  key: "test/file.txt",
  originalFileName: "file.txt",
  updatedAt: Date.now(),
  uploadedAt: Date.now(),
};

const makePayload = (overrides: Record<string, unknown> = {}) => ({
  file: {
    fileContent: {
      data: Buffer.from("data"),
      encoding: "utf8",
      filename: "report.pdf",
      mimetype: "application/pdf",
    },
    fileFields: {},
  },
  ...overrides,
});

// ── filename getter ───────────────────────────────────────────────────────────

describe("FileService — filename getter", async () => {
  const { default: FileService } = await import("../model/files/service");

  it("generates a UUID filename when none is set", () => {
    const service = new FileService(buildConfig(), {});
    service.fileExtension = "pdf";
    expect(service.filename).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\.pdf$/i,
    );
  });

  it("appends the extension when the set filename lacks it", () => {
    const service = new FileService(buildConfig(), {});
    service.fileExtension = "pdf";
    service.filename = "report";
    expect(service.filename).toBe("report.pdf");
  });

  it("returns filename unchanged when it already ends with the extension", () => {
    const service = new FileService(buildConfig(), {});
    service.fileExtension = "pdf";
    service.filename = "report.pdf";
    expect(service.filename).toBe("report.pdf");
  });
});

// ── key getter ────────────────────────────────────────────────────────────────

describe("FileService — key getter", async () => {
  const { default: FileService } = await import("../model/files/service");

  it("returns just the filename when no path is set", () => {
    const service = new FileService(buildConfig(), {});
    service.fileExtension = "txt";
    service.filename = "notes.txt";
    expect(service.key).toBe("notes.txt");
  });

  it("appends a trailing slash to path before building the key", () => {
    const service = new FileService(buildConfig(), {});
    service.fileExtension = "txt";
    service.filename = "notes.txt";
    service.path = "uploads/docs";
    expect(service.key).toBe("uploads/docs/notes.txt");
  });

  it("does not double-slash when path already ends with /", () => {
    const service = new FileService(buildConfig(), {});
    service.fileExtension = "txt";
    service.filename = "notes.txt";
    service.path = "uploads/docs/";
    expect(service.key).toBe("uploads/docs/notes.txt");
  });
});

// ── upload ────────────────────────────────────────────────────────────────────

describe("FileService — upload", async () => {
  const { default: FileService } = await import("../model/files/service");

  let service: InstanceType<typeof FileService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockS3.isFileExists.mockResolvedValue(false);
    mockS3.upload.mockResolvedValue({ ETag: "etag" });
    mockS3.getObjects.mockResolvedValue({ Contents: [] });
    service = new FileService(buildConfig(), {});
  });

  it("throws FILE_ALREADY_EXISTS_IN_S3_ERROR when strategy is 'error' and file exists", async () => {
    mockS3.isFileExists.mockResolvedValue(true);

    await expect(
      service.upload({
        ...makePayload(),
        options: { filenameResolutionStrategy: "error" },
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.FILE_ALREADY_EXISTS_IN_S3 });
  });

  it("uses config-level strategy when no per-upload strategy is provided", async () => {
    mockS3.isFileExists.mockResolvedValue(true);
    service = new FileService(
      buildConfig({ filenameResolutionStrategy: "error" }),
      {},
    );

    await expect(service.upload(makePayload())).rejects.toMatchObject({
      code: ERROR_CODES.FILE_ALREADY_EXISTS_IN_S3,
    });
  });

  it("per-upload filenameResolutionStrategy overrides config-level strategy", async () => {
    mockS3.isFileExists.mockResolvedValue(true);
    service = new FileService(
      buildConfig({ filenameResolutionStrategy: "error" }),
      {},
    );
    vi.spyOn(service, "create").mockResolvedValue(mockFile);

    // Per-upload "add-suffix" overrides config "error" — no throw
    await expect(
      service.upload({
        ...makePayload(),
        options: { filenameResolutionStrategy: "add-suffix" },
      }),
    ).resolves.not.toThrow();
  });

  it("appends a numeric suffix when strategy is 'add-suffix' and file exists", async () => {
    mockS3.isFileExists.mockResolvedValue(true);
    mockS3.getObjects.mockResolvedValue({
      Contents: [{ Key: "report-1.pdf" }],
    });

    const createSpy = vi.spyOn(service, "create").mockResolvedValue(mockFile);

    await service.upload({
      ...makePayload(),
      options: { filenameResolutionStrategy: "add-suffix" },
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.stringMatching(/-\d+\.pdf$/) }),
    );
  });

  it("uploads unconditionally when strategy is 'overwrite' and file exists", async () => {
    mockS3.isFileExists.mockResolvedValue(true);
    vi.spyOn(service, "create").mockResolvedValue(mockFile);

    await expect(
      service.upload({
        ...makePayload(),
        options: { filenameResolutionStrategy: "overwrite" },
      }),
    ).resolves.not.toThrow();

    expect(mockS3.upload).toHaveBeenCalledOnce();
  });

  it("skips the conflict check when file does not exist and uploads directly", async () => {
    vi.spyOn(service, "create").mockResolvedValue(mockFile);

    await service.upload(makePayload());

    expect(mockS3.upload).toHaveBeenCalledOnce();
    expect(mockS3.getObjects).not.toHaveBeenCalled();
  });
});

// ── download ──────────────────────────────────────────────────────────────────

describe("FileService — download", async () => {
  const { default: FileService } = await import("../model/files/service");

  let service: InstanceType<typeof FileService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileService(buildConfig(), {});
  });

  it("throws FILE_NOT_FOUND_ERROR when the file is not in the DB", async () => {
    vi.spyOn(service, "findById").mockResolvedValue();

    await expect(service.download(999)).rejects.toMatchObject({
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
  });

  it("returns file metadata with fileStream and mimeType when found", async () => {
    vi.spyOn(service, "findById").mockResolvedValue(mockFile);
    mockS3.get.mockResolvedValue({
      Body: Buffer.from("content"),
      ContentType: "image/png",
    });

    const result = await service.download(1);

    expect(result.fileStream).toBeDefined();
    expect(result.mimeType).toBe("image/png");
    expect(result.key).toBe(mockFile.key);
  });
});

// ── presignedUrl ──────────────────────────────────────────────────────────────

describe("FileService — presignedUrl", async () => {
  const { default: FileService } = await import("../model/files/service");

  let service: InstanceType<typeof FileService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileService(buildConfig(), {});
  });

  it("throws FILE_NOT_FOUND_ERROR when the file is not in the DB", async () => {
    vi.spyOn(service, "findById").mockResolvedValue();

    await expect(service.presignedUrl(999, {})).rejects.toMatchObject({
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
  });

  it("returns file metadata with a signed URL when found", async () => {
    vi.spyOn(service, "findById").mockResolvedValue(mockFile);
    mockS3.generatePresignedUrl.mockResolvedValue(
      "https://signed.url/file.txt",
    );

    const result = await service.presignedUrl(1, {});

    expect(result.url).toBe("https://signed.url/file.txt");
    expect(result.id).toBe(mockFile.id);
  });
});

// ── deleteFile ────────────────────────────────────────────────────────────────

describe("FileService — deleteFile", async () => {
  const { default: FileService } = await import("../model/files/service");

  let service: InstanceType<typeof FileService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileService(buildConfig(), {});
  });

  it("throws FILE_NOT_FOUND_ERROR when the file is not in the DB", async () => {
    vi.spyOn(service, "findById").mockResolvedValue();

    await expect(service.deleteFile(999)).rejects.toMatchObject({
      code: ERROR_CODES.FILE_NOT_FOUND,
    });
  });

  it("deletes the S3 object after the DB record is removed", async () => {
    vi.spyOn(service, "findById").mockResolvedValue(mockFile);
    vi.spyOn(service, "delete").mockResolvedValue(true);

    await service.deleteFile(1);

    expect(mockS3.delete).toHaveBeenCalledWith(mockFile.key);
  });

  it("does not delete from S3 when the DB deletion returns falsy", async () => {
    vi.spyOn(service, "findById").mockResolvedValue(mockFile);
    vi.spyOn(service, "delete").mockResolvedValue(false);

    await service.deleteFile(1);

    expect(mockS3.delete).not.toHaveBeenCalled();
  });
});
