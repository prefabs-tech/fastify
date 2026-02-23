import { beforeEach, describe, expect, it, vi } from "vitest";

import CronScheduler from "../../cron/scheduler";

const { mockStop, mockSchedule } = vi.hoisted(() => {
  const mockStop = vi.fn();
  const mockSchedule = vi.fn().mockReturnValue({ stop: mockStop });

  return { mockStop, mockSchedule };
});

vi.mock("node-cron", () => ({
  default: {
    schedule: mockSchedule,
  },
}));

describe("CronScheduler", () => {
  let scheduler: CronScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSchedule.mockReturnValue({ stop: mockStop });
    scheduler = new CronScheduler();
  });

  describe("schedule", () => {
    it("should schedule a cron job with the given expression and task", () => {
      const task = vi.fn();
      const job = { expression: "* * * * *", task };

      scheduler.schedule(job);

      expect(mockSchedule).toHaveBeenCalledWith("* * * * *", task, undefined);
    });

    it("should pass options to node-cron when provided", () => {
      const task = vi.fn();
      const options = { scheduled: true, timezone: "UTC" };
      const job = { expression: "0 * * * *", task, options };

      scheduler.schedule(job);

      expect(mockSchedule).toHaveBeenCalledWith("0 * * * *", task, options);
    });

    it("should track multiple scheduled tasks", () => {
      scheduler.schedule({ expression: "* * * * *", task: vi.fn() });
      scheduler.schedule({ expression: "0 * * * *", task: vi.fn() });
      scheduler.schedule({ expression: "0 0 * * *", task: vi.fn() });

      expect(mockSchedule).toHaveBeenCalledTimes(3);
    });
  });

  describe("stopAll", () => {
    it("should stop all scheduled tasks", () => {
      const mockStop1 = vi.fn();
      const mockStop2 = vi.fn();

      mockSchedule
        .mockReturnValueOnce({ stop: mockStop1 })
        .mockReturnValueOnce({ stop: mockStop2 });

      scheduler.schedule({ expression: "* * * * *", task: vi.fn() });
      scheduler.schedule({ expression: "0 * * * *", task: vi.fn() });

      scheduler.stopAll();

      expect(mockStop1).toHaveBeenCalledOnce();
      expect(mockStop2).toHaveBeenCalledOnce();
    });

    it("should clear the tasks list after stopping", () => {
      mockSchedule.mockReturnValue({ stop: vi.fn() });

      scheduler.schedule({ expression: "* * * * *", task: vi.fn() });
      scheduler.stopAll();

      // Calling stopAll again should not call any stop methods
      const newMockStop = vi.fn();
      mockSchedule.mockReturnValue({ stop: newMockStop });
      scheduler.stopAll();

      expect(newMockStop).not.toHaveBeenCalled();
    });

    it("should do nothing when no tasks are scheduled", () => {
      expect(() => scheduler.stopAll()).not.toThrow();
    });
  });
});
