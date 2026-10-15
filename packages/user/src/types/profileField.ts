interface ProfileField {
  createdAt: number;
  default?: string;
  i18n: ProfileFieldsI18n[];
  id: number;
  name: string;
  options?: ProfileFieldOptions[];
  required: boolean;
  sortOrder: number;
  type: number;
  updatedAt: number;
}

type ProfileFieldCreateInput = Partial<
  Omit<ProfileField, "createdAt" | "i18n" | "id" | "options" | "updatedAt">
>;

interface ProfileFieldOptions {
  createdAt: number;
  i18n: ProfileFieldOptionsI18n[];
  id: number;
  imageId?: number;
  rank: number;
  updatedAt: number;
  value: number;
}

interface ProfileFieldOptionsI18n {
  createdAt: number;
  description?: string;
  id: number;
  label: string;
  locale: string;
  updatedAt: number;
}

interface ProfileFieldsI18n {
  createdAt: number;
  description?: string;
  id: number;
  label: string;
  locale: string;
  updatedAt: number;
}

type ProfileFieldUpdateInput = Partial<
  Omit<ProfileField, "createdAt" | "i18n" | "id" | "options" | "updatedAt">
>;

export type { ProfileField, ProfileFieldCreateInput, ProfileFieldUpdateInput };
