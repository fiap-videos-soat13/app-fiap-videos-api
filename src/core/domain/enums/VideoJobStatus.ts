export const VideoJobStatus = {
  Pending: "pending",
  Processing: "processing",
  Completed: "completed",
  Failed: "failed",
} as const;

export type VideoJobStatus =
  (typeof VideoJobStatus)[keyof typeof VideoJobStatus];
