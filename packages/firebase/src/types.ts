import "@prefabs.tech/fastify-error-handler";

interface TestNotificationInput {
  data?: {
    [key: string]: string;
  };
  message: string;
  title: string;
  userId: string;
}

interface User {
  id: string;
}

interface UserDevice {
  createdAt: number;
  deviceToken: string;
  updatedAt: number;
  userId: string;
}

type UserDeviceCreateInput = Partial<
  Omit<UserDevice, "createdAt" | "updatedAt">
>;

type UserDeviceUpdateInput = Partial<
  Omit<UserDevice, "createdAt" | "updatedAt" | "userId">
>;

export type {
  TestNotificationInput,
  User,
  UserDevice,
  UserDeviceCreateInput,
  UserDeviceUpdateInput,
};
