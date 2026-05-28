import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AiService } from './ai/ai.service';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private readonly ai: AiService,
  ) {}

  async chat(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    conversationId?: string,
  ): Promise<{ content: string | null; conversationId: string }> {
    if (!conversationId) {
      const conv = this.conversationRepo.create({ title: '新建会话' });
      const saved = await this.conversationRepo.save(conv);
      conversationId = saved.id;
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && lastUserMsg.content) {
      const msg = this.messageRepo.create({
        role: String(lastUserMsg.role),
        content: String(lastUserMsg.content),
        conversationId,
      });
      await this.messageRepo.save(msg);
    }

    const content = await this.ai.chat(messages);

    if (content) {
      const msg = this.messageRepo.create({
        role: 'assistant',
        content,
        conversationId,
      });
      await this.messageRepo.save(msg);
    }

    return { content, conversationId };
  }
}