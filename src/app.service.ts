import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class AppService {
  client: OpenAI;

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {
    this.client = new OpenAI({
      apiKey: 'xxx',
      baseURL: 'https://api.deepseek.com',
    });
  }

  async chat(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    conversationId?: string,
  ): Promise<{ content: string | null; conversationId: string }> {
    // 如果没传 conversationId，则新建一个会话
    if (!conversationId) {
      const conv = this.conversationRepo.create({ title: 'New Conversation' });
      const saved = await this.conversationRepo.save(conv);
      conversationId = saved.id;
    }

    // 保存最后一条用户/助手消息到数据库（忽略已有的历史消息不去重，仅保存本次新增的）
    // 简单策略：保存 messages 数组的最后一条非 assistant 消息（用户输入）
    // 实际上前端传的是完整历史，我们只保存本次调用的最后一条 user 消息
    // 这里简化：保存所有 messages 中不在数据库里的（按时间顺序新消息）
    // 最简策略：先保存本次用户最后一条输入消息
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && lastUserMsg.content) {
      const msg = this.messageRepo.create({
        role: String(lastUserMsg.role),
        content: String(lastUserMsg.content),
        conversationId,
      });
      await this.messageRepo.save(msg);
    }

    // 调用 AI
    const response = await this.client.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages,
      reasoning_effort: 'high',
    });

    const content = response.choices[0].message.content;

    // 保存 AI 回复
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