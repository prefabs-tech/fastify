import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetSignedUrl, mockSend } = vi.hoisted(() => ({
  mockGetSignedUrl: vi.fn(),
  mockSend: vi.fn(),
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
