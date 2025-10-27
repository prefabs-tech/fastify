interface File {
  id: number;
  originalFileName: string;
  bucket?: string;
  description?: string;
  key: string;
  uploadedById?: string;
  uploadedAt: number;
  downloadCount?: number;
  lastDownloadedAt?: number;
  createdAt: number;
  updatedAt: number;
}

type FileCreateInput = Omit<
  File,
  "id" | "originalFileName" | "key" | "createdAt" | "updatedAt"
>;

type FileUpdateInput = Partial<Omit<File, "id" | "createdAt" | "updatedAt">>;

export type { File, FileCreateInput, FileUpdateInput };
