import { VideoEventType } from "@validators/VideoEventEnvelopeValidator";
import { queueName } from "../amqp/AmqpTopology";

export const SubscribersConfig = Object.freeze({
  VideoProcessingStarted: {
    consumerName: "api.on-video-processing-started",
    queueName: queueName("api", VideoEventType.VideoProcessingStarted),
    eventType: VideoEventType.VideoProcessingStarted,
  },
  VideoProcessingCompleted: {
    consumerName: "api.on-video-processing-completed",
    queueName: queueName("api", VideoEventType.VideoProcessingCompleted),
    eventType: VideoEventType.VideoProcessingCompleted,
  },
  VideoProcessingFailed: {
    consumerName: "api.on-video-processing-failed",
    queueName: queueName("api", VideoEventType.VideoProcessingFailed),
    eventType: VideoEventType.VideoProcessingFailed,
  },
});
