import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AppService {
  client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      // sdk
      apiKey: 'sk-1692361591704ac8903c92ebc0659810',
      baseURL: 'https://api.deepseek.com',
    });
  }
  async chat(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): Promise<string | null> {
    const response = await this.client.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages,
      reasoning_effort: 'high',
      // extra_body: { thinking: { type: 'enabled' } },
    });
    // const reasoning_content = response.choices[0].message.reasoning_content;
    // const content = response.choices[0].message.content;
    return response.choices[0].message.content;
  }
}
