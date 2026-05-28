import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import OpenAI from 'openai';
import { AiService } from '../ai/ai.service';

type ChatMessages = OpenAI.Chat.Completions.ChatCompletionMessageParam[];

@Controller('demo')
export class DemoController {
  constructor(private readonly ai: AiService) {}

  /** 单轮：GET /demo/ask?q=讲个笑话 */
  @Get('ask')
  async ask(@Query('q') q: string): Promise<{ answer: string }> {
    const answer = await this.ai.ask(q);
    return { answer };
  }

  /** 多轮：POST /demo/chat   body: { messages: [...] } */
  @Post('chat')
  async chat(@Body() body: { messages: ChatMessages }): Promise<{ answer: string }> {
    const answer = await this.ai.chat(body.messages);
    return { answer };
  }

  /** 流式：GET /demo/stream?q=讲个笑话    (text/event-stream) */
  @Get('stream')
  async stream(@Query('q') q: string, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.ai.askStream(q)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('event: done\ndata: [DONE]\n\n');
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify(String(err))}\n\n`);
    } finally {
      res.end();
    }
  }

  /** 流式多轮：POST /demo/chat-stream    body: { messages: [...] } */
  @Post('chat-stream')
  async chatStream(
    @Body() body: { messages: ChatMessages },
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.ai.stream(body.messages)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('event: done\ndata: [DONE]\n\n');
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify(String(err))}\n\n`);
    } finally {
      res.end();
    }
  }
}
