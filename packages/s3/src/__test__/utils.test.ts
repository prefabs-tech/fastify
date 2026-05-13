import type { ListObjectsOutput } from "@aws-sdk/client-s3";

import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import { BUCKET_FROM_FILE_FIELDS, BUCKET_FROM_OPTIONS } from "../constants";
import {
  convertStreamToBuffer,
  getBaseName,
  getFileExtension,
  getFilenameWithSuffix,
  getPreferredBucket,
} from "../utils";

describe("getBaseName", () => {
  it("removes the file extension", () => {
    expect(getBaseName("document.pdf")).toBe("document");
  });

  it("removes only the last extension when multiple dots are present", () => {
    expect(getBaseName("archive.tar.gz")).toBe("archive.tar");
  });

  it("returns the filename unchanged when no extension is present", () => {
    expect(getBaseName("Makefile")).toBe("Makefile");
  });
});

describe("getFileExtension", () => {
  it("returns the extension without the leading dot", () => {
    expect(getFileExtension("document.pdf")).toBe("pdf");
  });

  it("returns the last extension when multiple dots are present", () => {
    expect(getFileExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns empty string when there is no extension", () => {
    expect(getFileExtension("Makefile")).toBe("");
  });

  it("returns the text after the dot for dotfiles", () => {
    expect(getFileExtension(".env")).toBe("env");
  });
});

describe("getPreferredBucket", () => {
  it("returns optionsBucket when bucketChoice is BUCKET_FROM_OPTIONS and optionsBucket is set", () => {
    expect(
      getPreferredBucket("opts-bucket", "file-bucket", BUCKET_FROM_OPTIONS),
    ).toBe("opts-bucket");
  });

  it("returns fileFieldsBucket when bucketChoice is BUCKET_FROM_FILE_FIELDS and fileFieldsBucket is set", () => {
    expect(
      getPreferredBucket("opts-bucket", "file-bucket", BUCKET_FROM_FILE_FIELDS),
    ).toBe("file-bucket");
  });

  it("returns fileFieldsBucket when only fileFieldsBucket is provided (no optionsBucket)", () => {
    expect(getPreferredBucket(undefined, "file-bucket")).toBe("file-bucket");
  });

  it("returns optionsBucket when only optionsBucket is provided (no fileFieldsBucket)", () => {
    expect(getPreferredBucket("opts-bucket")).toBe("opts-bucket");
  });

  it("returns the shared value when both buckets are equal and no bucketChoice is set", () => {
    expect(getPreferredBucket("same", "same")).toBe("same");
  });

  it("returns fileFieldsBucket when both differ and no bucketChoice is set", () => {
    expect(getPreferredBucket("opts-bucket", "file-bucket")).toBe(
      "file-bucket",
    );
  });

  it("returns undefined when neither bucket is provided", () => {
    expect(getPreferredBucket()).toBeUndefined();
  });

  it("falls back to fileFieldsBucket when bucketChoice is BUCKET_FROM_OPTIONS but optionsBucket is not set", () => {
    expect(
      getPreferredBucket(undefined, "file-bucket", BUCKET_FROM_OPTIONS),
    ).toBe("file-bucket");
  });

  it("falls back to optionsBucket when bucketChoice is BUCKET_FROM_FILE_FIELDS but fileFieldsBucket is not set", () => {
    expect(
      getPreferredBucket("opts-bucket", undefined, BUCKET_FROM_FILE_FIELDS),
    ).toBe("opts-bucket");
  });
});

describe("getFilenameWithSuffix", () => {
  it("returns filename with suffix -1 when no suffixed files exist in listing", () => {
    const listing: ListObjectsOutput = { Contents: [] };
    expect(getFilenameWithSuffix(listing, "report", "pdf")).toBe(
      "report-1.pdf",
    );
  });

  it("returns filename with the next available suffix when suffixed files already exist", () => {
    const listing: ListObjectsOutput = {
      Contents: [{ Key: "report-1.pdf" }, { Key: "report-2.pdf" }],
    };
    expect(getFilenameWithSuffix(listing, "report", "pdf")).toBe(
      "report-3.pdf",
    );
  });

  it("returns filename with suffix -1 when Contents is undefined", () => {
    const listing: ListObjectsOutput = {};
    expect(getFilenameWithSuffix(listing, "report", "pdf")).toBe(
      "report-1.pdf",
    );
  });

  it("ignores keys that do not match the base name pattern", () => {
    const listing: ListObjectsOutput = {
      Contents: [{ Key: "other-file.pdf" }, { Key: "report.pdf" }],
    };
    expect(getFilenameWithSuffix(listing, "report", "pdf")).toBe(
      "report-1.pdf",
    );
  });

  it("picks the highest existing numeric suffix and increments it", () => {
    const listing: ListObjectsOutput = {
      Contents: [
        { Key: "report-1.pdf" },
        { Key: "report-5.pdf" },
        { Key: "report-3.pdf" },
      ],
    };
    expect(getFilenameWithSuffix(listing, "report", "pdf")).toBe(
      "report-6.pdf",
    );
  });
});

describe("convertStreamToBuffer", () => {
  it("converts a readable stream to a buffer containing all chunks", async () => {
    const stream = Readable.from([Buffer.from("hello"), Buffer.from(" world")]);
    const buffer = await convertStreamToBuffer(stream);
    expect(buffer.toString()).toBe("hello world");
  });

  it("returns an empty buffer for an empty stream", async () => {
    const stream = Readable.from([]);
    const buffer = await convertStreamToBuffer(stream);
    expect(buffer.length).toBe(0);
  });

  it("rejects when the stream emits an error", async () => {
    const stream = new Readable({
      read() {
        this.emit("error", new Error("stream error"));
      },
    });
    await expect(convertStreamToBuffer(stream)).rejects.toThrow("stream error");
  });
});
