import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { Config } from "./config.js";
import type { StreamMetrics } from "./metrics.js";

/**
 * 执行 Anthropic API 流式测试
 */
export async function anthropicStreamTest(config: Config): Promise<StreamMetrics> {
  const startTime = Date.now();
  const tokenTimes: number[] = [];
  let ttft = 0;
  let firstTokenRecorded = false;

  const client = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  try {
    const stream = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [{ role: "user", content: config.prompt }],
      stream: true,
    });

    for await (const event of stream) {
      const currentTime = Date.now();

      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const text = event.delta.text;

        if (text && text.length > 0) {
          if (!firstTokenRecorded) {
            ttft = currentTime - startTime;
            firstTokenRecorded = true;
          }

          // 记录每个字符的到达时间（作为近似的 token 时间）
          for (let i = 0; i < text.length; i++) {
            tokenTimes.push(currentTime - startTime);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
    throw error;
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;

  return {
    ttft,
    tokens: tokenTimes,
    totalTokens: tokenTimes.length,
    totalTime,
  };
}

/**
 * 执行 OpenAI API 流式测试
 */
export async function openaiStreamTest(config: Config): Promise<StreamMetrics> {
  const startTime = Date.now();
  const tokenTimes: number[] = [];
  let ttft = 0;
  let firstTokenRecorded = false;

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  try {
    const stream = await client.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [{ role: "user", content: config.prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const currentTime = Date.now();

      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        const content = delta.content;

        if (!firstTokenRecorded && content.length > 0) {
          ttft = currentTime - startTime;
          firstTokenRecorded = true;
        }

        // 记录每个字符的到达时间
        for (let i = 0; i < content.length; i++) {
          tokenTimes.push(currentTime - startTime);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;

  return {
    ttft,
    tokens: tokenTimes,
    totalTokens: tokenTimes.length,
    totalTime,
  };
}

/**
 * 根据配置执行流式测试
 */
export async function streamTest(config: Config): Promise<StreamMetrics> {
  if (config.provider === "anthropic") {
    return anthropicStreamTest(config);
  } else {
    return openaiStreamTest(config);
  }
}

/**
 * 执行多次测试
 */
export async function runMultipleTests(config: Config): Promise<StreamMetrics[]> {
  const results: StreamMetrics[] = [];

  for (let i = 0; i < config.runCount; i++) {
    const result = await streamTest(config);
    results.push(result);
  }

  return results;
}
