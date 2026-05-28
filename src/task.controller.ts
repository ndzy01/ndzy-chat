import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TaskService } from './task.service';
import type { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import type { Subtask } from './entities/subtask.entity';

@Controller('api/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  // ========== CRUD ==========

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('targetDate') targetDate?: string,
  ): Promise<Task[]> {
    return this.taskService.findAll(req.tenantId, status, priority, targetDate);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: {
      title: string;
      description?: string;
      priority?: TaskPriority;
      dueDate?: string;
      targetDate?: string;
    },
  ): Promise<Task> {
    return this.taskService.create(req.tenantId, body);
  }

  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: Partial<Task>,
  ): Promise<Task | null> {
    return this.taskService.update(req.tenantId, id, data);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string): Promise<{ ok: boolean }> {
    return this.taskService.remove(req.tenantId, id);
  }

  // ========== AI 赋能接口 ==========

  @Post(':id/breakdown')
  async breakdown(@Req() req: Request, @Param('id') id: string): Promise<Subtask[]> {
    return this.taskService.breakdown(req.tenantId, id);
  }

  @Post('summarize')
  async summarize(@Req() req: Request, @Body('ids') ids: string[]): Promise<string> {
    return this.taskService.summarize(req.tenantId, ids);
  }

  @Post('parse')
  async parse(@Req() req: Request, @Body('text') text: string): Promise<Task> {
    return this.taskService.parse(req.tenantId, text);
  }

  @Get('daily-brief')
  async dailyBrief(@Req() req: Request): Promise<string> {
    return this.taskService.dailyBrief(req.tenantId);
  }

  @Get('search')
  async search(@Req() req: Request, @Query('q') query: string): Promise<string> {
    return this.taskService.search(req.tenantId, query);
  }

  @Post('draft')
  async draft(@Req() req: Request, @Body('text') text: string, @Body('targetDate') targetDate?: string): Promise<Task[]> {
    return this.taskService.draft(req.tenantId, text, targetDate);
  }

  @Get('nudge')
  async nudge(@Req() req: Request): Promise<string> {
    return this.taskService.nudge(req.tenantId);
  }

  @Get('recommend')
  async recommend(@Req() req: Request): Promise<string> {
    return this.taskService.recommend(req.tenantId);
  }

  // Subtask: 切换完成状态
  @Post('/subtasks/:id/toggle')
  async toggleSubtask(@Param('id') id: string): Promise<Subtask> {
    return this.taskService.toggleSubtask(id);
  }
}
