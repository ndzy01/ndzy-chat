import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Controller('api/conversations')
export class ConversationController {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  // 获取所有会话列表（排除软删除的）
  @Get()
  async findAll(): Promise<Conversation[]> {
    return this.conversationRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  // 新建会话
  @Post()
  async create(@Body('title') title: string): Promise<Conversation> {
    const conversation = this.conversationRepo.create({
      title: title || 'New Conversation',
    });
    return this.conversationRepo.save(conversation);
  }

  // 获取单个会话详情（含消息）
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Conversation | null> {
    return this.conversationRepo.findOne({
      where: { id },
      relations: { messages: true } as any,
      order: { messages: { createdAt: 'ASC' } },
    } as any);
  }

  // 软删除会话
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: boolean }> {
    await this.conversationRepo.softDelete(id);
    return { ok: true };
  }

  // 更新会话标题
  @Post(':id/title')
  async updateTitle(
    @Param('id') id: string,
    @Body('title') title: string,
  ): Promise<Conversation | null> {
    await this.conversationRepo.update(id, { title });
    return this.conversationRepo.findOne({ where: { id } } as any);
  }
}