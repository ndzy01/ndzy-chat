import { Body, Controller, Post } from '@nestjs/common';
import OpenAI from 'openai';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('chat')
  async chat(
    @Body()
    body: {
      messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    },
  ): Promise<string | null> {
    return this.appService.chat(body.messages);
  }
}
