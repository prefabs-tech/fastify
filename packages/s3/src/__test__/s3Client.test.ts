import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetSignedUrl, mockSend, mockUploadCtor, mockUploadDone } =
  vi.hoisted(() => ({
    mockGetSignedUrl: vi.fn(),
    mockSend: vi.fn(),
    mockUploadCtor: vi.fn(),
    mockUploadDone: vi.fn(),
  }));

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: vi.fn().mockImplementation((arguments_: unknown) => {
    mockUploadCtor(arguments_);
    return { done: mockUploadDone };
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("S3Client — isFileExists", async () => {
  const { default: S3ClientWrapper } = await import("../utils/s3Client");

  let client: InstanceType<typeof S3ClientWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new S3ClientWrapper({});
    client.bucket = "test-bucket";
  });

  it("returns true when the object exists in S3", async () => {
    mockSend.mockResolvedValue({ ContentLength: 1024 });

    const result = await client.isFileExists("avatars/photo.jpg");

    expect(result).toBe(true);
  });

  it("returns false when S3 throws a NotFound error", async () => {
    const notFound = Object.assign(new Error("Not Found"), {
      name: "NotFound",
    });
    mockSend.mockRejectedValue(notFound);

    const result = await client.isFileExists("avatars/missing.jpg");

    expect(result).toBe(false);
  });

  it("rethrows errors that are not NotFound", async () => {
    const accessDenied = Object.assign(new Error("Access Denied"), {
      name: "AccessDenied",
    });
    mockSend.mockRejectedValue(accessDenied);

    await expect(client.isFileExists("private/file.txt")).rejects.toThrow(
      "Access Denied",
    );
  });
});

describe("S3Client — generatePresignedUrl", async () => {
  const { default: S3ClientWrapper } = await import("../utils/s3Client");

  let client: InstanceType<typeof S3ClientWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue("https://presigned.url/file.pdf");
    client = new S3ClientWrapper({});
    client.bucket = "test-bucket";
  });

  it("uses a default expiry of 3600 seconds when none is provided", async () => {
    await client.generatePresignedUrl("reports/q1.pdf", "Q1 Report.pdf");

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 3600 },
    );
  });

  it("uses the provided expiry when specified", async () => {
    await client.generatePresignedUrl("reports/q1.pdf", "Q1 Report.pdf", 900);

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 900 },
    );
  });

  it("sets ResponseContentDisposition with the original filename", async () => {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");

    await client.generatePresignedUrl("reports/q1.pdf", "Q1 Report.pdf");

    const commandArgument = mockGetSignedUrl.mock.calls[0][1];
    expect(commandArgument).toBeInstanceOf(GetObjectCommand);
    expect(commandArgument.input.ResponseContentDisposition).toBe(
      'attachment; filename="Q1 Report.pdf"',
    );
  });

  it("returns the signed URL from the presigner", async () => {
    const url = await client.generatePresignedUrl("file.pdf", "file.pdf");
    expect(url).toBe("https://presigned.url/file.pdf");
  });
});

describe("S3Client — object operations", async () => {
  const { default: S3ClientWrapper } = await import("../utils/s3Client");

  let client: InstanceType<typeof S3ClientWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new S3ClientWrapper({});
    client.bucket = "test-bucket";
  });

  it("sends DeleteObjectCommand with bucket and key", async () => {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    mockSend.mockResolvedValue({ DeleteMarker: true });

    await client.delete("docs/report.pdf");

    expect(mockSend).toHaveBeenCalledOnce();
    const commandArgument = mockSend.mock.calls[0][0];
    expect(commandArgument).toBeInstanceOf(DeleteObjectCommand);
    expect(commandArgument.input).toEqual({
      Bucket: "test-bucket",
      Key: "docs/report.pdf",
    });
  });

  it("sends GetObjectCommand and returns buffered body with content type", async () => {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    mockSend.mockResolvedValue({
      Body: Readable.from([Buffer.from("hello"), Buffer.from(" world")]),
      ContentType: "text/plain",
    });

    const response = await client.get("docs/report.txt");

    expect(mockSend).toHaveBeenCalledOnce();
    const commandArgument = mockSend.mock.calls[0][0];
    expect(commandArgument).toBeInstanceOf(GetObjectCommand);
    expect(commandArgument.input).toEqual({
      Bucket: "test-bucket",
      Key: "docs/report.txt",
    });
    expect(response.Body.toString()).toBe("hello world");
    expect(response.ContentType).toBe("text/plain");
  });

  it("sends ListObjectsCommand with the requested prefix", async () => {
    const { ListObjectsCommand } = await import("@aws-sdk/client-s3");
    mockSend.mockResolvedValue({ Contents: [] });

    await client.getObjects("docs/report");

    expect(mockSend).toHaveBeenCalledOnce();
    const commandArgument = mockSend.mock.calls[0][0];
    expect(commandArgument).toBeInstanceOf(ListObjectsCommand);
    expect(commandArgument.input).toEqual({
      Bucket: "test-bucket",
      Prefix: "docs/report",
    });
  });

  it("creates Upload with S3 params and returns done() result", async () => {
    mockUploadDone.mockResolvedValue({ ETag: "etag-value" });
    const payload = Buffer.from("content");

    const result = await client.upload(
      payload,
      "docs/report.txt",
      "text/plain",
    );

    expect(mockUploadCtor).toHaveBeenCalledOnce();
    expect(mockUploadCtor).toHaveBeenCalledWith({
      client: expect.anything(),
      params: {
        Body: payload,
        Bucket: "test-bucket",
        ContentType: "text/plain",
        Key: "docs/report.txt",
      },
    });
    expect(mockUploadDone).toHaveBeenCalledOnce();
    expect(result).toEqual({ ETag: "etag-value" });
  });
});
