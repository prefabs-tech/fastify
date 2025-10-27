import "@prefabs.tech/fastify-error-handler";

interface UserDevice {
  userId: string;
  deviceToken: string;
  createdAt: number;
  updatedAt: number;
}

interface User {
  id: string;
}

interface TestNotificationInput {
  userId: string;
  title: string;
  body: string;
  data?: {
    [key: string]: string;
  };
}

type UserDeviceCreateInput = Partial<
  Omit<UserDevice, "createdAt" | "updatedAt">
>;

type UserDeviceUpdateInput = Partial<
  Omit<UserDevice, "userId" | "createdAt" | "updatedAt">
>;

export type {
  TestNotificationInput,
  User,
  UserDevice,
  UserDeviceCreateInput,
  UserDeviceUpdateInput,
};
