// models/math-topic.model.ts

export interface SubTopic {
  sub_topic: string;
  explanation: string;
  examples: string[];
}

export interface Topic {
  topic: string;
  sub_topics: SubTopic[];
}
