import type { FastifyRequest } from "fastify";

import Busboy, { FileInfo } from "busboy";
import { IncomingMessage } from "node:http";
import { Readable } from "node:stream";

import type { MultipartFile } from "../types";

const processMultipartFormData = (
  req: FastifyRequest,
  _payload: IncomingMessage,
  done: (err: Error | null, body?: unknown) => void,
) => {
  const busboyParser = Busboy({
    headers: req.headers,
  });

  const fields: Record<string, string> = {};
  const files: Record<string, MultipartFile[]> = {};

  busboyParser.on("field", (fieldName, value) => {
    fields[fieldName] = value;
  });

  busboyParser.on(
    "file",
    (fieldName: string, file: Readable, fileInfo: FileInfo) => {
      const chunks: Buffer[] = [];

      file.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        const fileBuffer = Buffer.concat(chunks);

        if (!files[fieldName]) {
          files[fieldName] = [];
        }

        files[fieldName].push({
          ...fileInfo,
          data: fileBuffer,
          mimetype: fileInfo.mimeType,
        });
      });
    },
  );

  busboyParser.on("finish", () => {
    req.body = {
      ...fields,
      ...files,
    };

    // eslint-disable-next-line unicorn/no-null
    done(null, req.body);
  });

  busboyParser.on("error", (err) => {
    req.log.error(err);
  });

  _payload.pipe(busboyParser);
};

export { processMultipartFormData };
