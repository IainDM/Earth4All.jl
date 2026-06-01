import { logger } from "./logger.js";
import { PROGRESS_HEARTBEAT_MS } from "../constants.js";

interface ExtraWithProgress {
  _meta?: { progressToken?: string | number };
  sendNotification?: (notification: {
    method: string;
    params: Record<string, unknown>;
  }) => Promise<void> | void;
}

export function makeProgressCallback(
  extra: unknown,
  toolName: string,
): (() => void) | undefined {
  const e = extra as ExtraWithProgress | undefined;
  const progressToken = e?._meta?.progressToken;
  const sendNotification = e?.sendNotification;
  if (progressToken === undefined || !sendNotification) {
    return undefined;
  }

  let ticks = 0;
  return () => {
    ticks += 1;
    const elapsedSec = Math.round((ticks * PROGRESS_HEARTBEAT_MS) / 1000);
    try {
      const ret = sendNotification({
        method: "notifications/progress",
        params: {
          progressToken,
          progress: ticks,
          message: `${toolName}: Julia working (${elapsedSec}s elapsed)`,
        },
      });
      if (ret && typeof (ret as Promise<void>).catch === "function") {
        (ret as Promise<void>).catch((err: unknown) => {
          logger.warn(
            `progress notification failed for ${toolName}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }
    } catch (err) {
      logger.warn(
        `progress notification threw for ${toolName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };
}
