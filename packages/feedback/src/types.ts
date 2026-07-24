import "@prefabs.tech/fastify-error-handler";

interface Feedback {
  appVersion?: string;
  createdAt: number;
  deviceModel?: string;
  id: number;
  message: string;
  platform?: string;
  typeId: number;
  updatedAt: number;
  userId?: string;
}

type FeedbackCreateInput = Partial<
  Omit<Feedback, "createdAt" | "id" | "updatedAt">
>;

type FeedbackUpdateInput = Partial<
  Omit<Feedback, "createdAt" | "id" | "updatedAt" | "userId">
>;

interface User {
  id: string;
}

export type { Feedback, FeedbackCreateInput, FeedbackUpdateInput, User };
