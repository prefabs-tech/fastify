interface File {
  bucket?: string;
  createdAt: number;
  description?: string;
  downloadCount?: number;
  id: number;
  key: string;
  lastDownloadedAt?: number;
  originalFileName: string;
  updatedAt: number;
  uploadedAt: number;
  uploadedById?: string;
}

type FileCreateInput = Omit<
  File,
  "createdAt" | "id" | "key" | "originalFileName" | "updatedAt"
>;

type FileUpdateInput = Partial<Omit<File, "createdAt" | "id" | "updatedAt">>;

export type { File, FileCreateInput, FileUpdateInput };
