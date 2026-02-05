import { Ajv, AnySchemaObject } from "ajv";

const isMultipart = (file: unknown): boolean =>
  typeof file === "object" &&
  file !== null &&
  "data" in file &&
  "filename" in file &&
  "mimetype" in file;

const validateFile = (data: unknown): boolean => {
  if (Array.isArray(data)) {
    return data.every((file) => isMultipart(file));
  }

  return isMultipart(data);
};

export default function plugin(ajv: Ajv): Ajv {
  return ajv.addKeyword({
    keyword: "isFile",
    compile: (_schema: boolean, parentSchema: AnySchemaObject) => {
      const schema = parentSchema;
      if (schema.type === "array") {
        if (schema.items && typeof schema.items === "object") {
          schema.items.type = "string";
          schema.items.format = "binary";
          delete schema.items.isFile;
          delete parentSchema.items.isFile;
        }
      } else {
        schema.type = "string";
        schema.format = "binary";
        delete schema.isFile;
        delete parentSchema.isFile;
      }

      // Runtime validator
      return validateFile;
    },
    error: {
      message: "should be a file or array of files",
    },
  });
}
