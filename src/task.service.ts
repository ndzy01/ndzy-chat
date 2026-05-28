import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, LessThan } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { AiService } from './ai/ai.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(Subtask)
    private subtaskRepo: Repository<Subtask>,
    private readonly ai: AiService,
  ) {}

  // ========== CRUD ==========

  async findAll(tenantId: string | undefined, status?: TaskStatus, priority?: TaskPriority, targetDate?: string): Promise<Task[]> {
    const where: any = { tenantId: tenantId || null };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (targetDate) where.targetDate = targetDate;
    return this.taskRepo.find({
      where,
      relations: { subtasks: true } as any,
      order: { createdAt: 'DESC' },
    });
  }

  async create(tenantId: string | undefined, data: { title: string; description?: string; priority?: TaskPriority; dueDate?: string; targetDate?: string }): Promise<Task> {
    const task = this.taskRepo.create({
      title: data.title,
      description: data.description || null,
      priority: data.priority || 'medium',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      targetDate: data.targetDate || null,
      tenantId: tenantId || null,
    });
    return this.taskRepo.save(task);
  }

  async update(tenantId: string | undefined, id: string, data: Partial<Task>): Promise<Task | null> {
    await this.taskRepo.update({ id, tenantId: tenantId || null } as any, data as any);
    return this.taskRepo.findOne({ where: { id, tenantId: tenantId || null } as any, relations: { subtasks: true } as any });
  }

  async remove(tenantId: string | undefined, id: string): Promise<{ ok: boolean }> {
    await this.taskRepo.softDelete({ id, tenantId: tenantId || null } as any);
    return { ok: true };
  }

  // ========== AI 1: 任务拆解 ==========

  async breakdown(tenantId: string | undefined, id: string): Promise<Subtask[]> {
    const task = await this.taskRepo.findOne({ where: { id, tenantId: tenantId || null } as any });
    if (!task) throw new Error('Task not found');

    const prompt = `你是一个任务拆解专家。请将以下任务拆分为 3-6 个可执行的子任务，每个子任务一行，每行以 "- " 开头，只返回列表。

任务标题：${task.title}
任务描述：${task.description || '无'}
优先级：${task.priority}
截止日期：${task.dueDate || '无'}`;

    const result = await this.ai.ask(prompt);
    const lines = result
      .split('\n')
      .filter((l: string) => l.trim().startsWith('-'))
      .map((l: string) => l.replace(/^-\s*/, '').trim())
      .filter(Boolean);

    const subtasks = await Promise.all(
      lines.map((title: string) =>
        this.subtaskRepo.save(
          this.subtaskRepo.create({ title, taskId: id }),
        ),
      ),
    );

    return subtasks;
  }

  // ========== AI 2: 工作总结 ==========

  async summarize(tenantId: string | undefined, ids: string[]): Promise<string> {
    const tasks = await this.taskRepo.findBy(ids.map((id) => ({ id, tenantId: tenantId || null } as any)));
    const listText = tasks
      .map(
        (t) =>
          `- [${t.status === 'done' ? '✓' : '○'}] ${t.title}${t.description ? ' — ' + t.description : ''}`,
      )
      .join('\n');

    const prompt = `你是一个工作总结助手。请根据以下任务列表生成一段简洁的周报风格总结，按重要程度排列，字数 200 字以内：

${listText}`;

    return this.ai.ask(prompt);
  }

  // ========== AI 3: 自然语言解析 ==========

  async parse(tenantId: string | undefined, text: string): Promise<Task> {
    const prompt = `你是一个任务解析器。从用户输入中提取任务信息，返回纯JSON（不要Markdown标记）：
{
  "title": "简洁任务标题（最多30字）",
  "description": "详细描述（可选，null表示无）",
  "priority": "low|medium|high",
  "dueDate": "ISO8601日期字符串（可选，null表示无）"
}

用户输入：${text}`;

    const result = await this.ai.ask(prompt);
    let parsed;
    try {
      const cleaned = result.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { title: text, description: null, priority: 'medium', dueDate: null };
    }

    return this.create(tenantId, parsed);
  }

  // ========== AI 4: 每日焦点简报 ==========

  async dailyBrief(tenantId: string | undefined): Promise<string> {
    const tasks = await this.taskRepo.find({
      where: { status: 'todo', tenantId: tenantId || null } as any,
      order: { dueDate: 'ASC' },
    });

    const listText = tasks
      .slice(0, 10)
      .map((t, i) => `${i + 1}. ${t.title} [优先级:${t.priority}] [截止:${t.dueDate || '无'}]`)
      .join('\n');

    const prompt = `你是一个每日规划助手。根据以下待办任务，为今天推荐 3-5 个最应该优先完成的任务，按紧急 + 重要排列，用简洁的中文说明理由。每条格式："🔴/🟡/🟢 任务名 — 理由"。

${listText || '今天没有待办任务'}`;

    return this.ai.ask(prompt);
  }

  // ========== AI 5: 智能搜索 ==========

  async search(tenantId: string | undefined, query: string): Promise<string> {
    const tasks = await this.taskRepo.find({
      where: { title: Like(`%${query}%`), tenantId: tenantId || null } as any,
      take: 10,
    });

    const listText = tasks
      .map((t) => `- [${t.status}] ${t.title} | 优先级:${t.priority} | 截止:${t.dueDate || '无'}`)
      .join('\n');

    if (tasks.length === 0) return '没有找到匹配的任务。';

    const prompt = `你是一个搜索助手。根据用户查询和搜索结果，用中文简要概括找到的任务，并按相关性排列：

用户查询：${query}
搜索结果：
${listText}`;

    return this.ai.ask(prompt);
  }

  // ========== AI 6: 脑暴转任务 ==========

  async draft(tenantId: string | undefined, text: string, targetDate?: string): Promise<Task[]> {
    const prompt = `你是一个思路整理助手。从以下用户散乱的思绪中提取所有可执行的任务，返回纯JSON数组（不要Markdown标记），每个任务：
{
  "title": "简洁标题",
  "description": "细节描述（可选null）",
  "priority": "low|medium|high"
}

用户输入：${text}`;

    const result = await this.ai.ask(prompt);
    let items: any[];
    try {
      const cleaned = result.replace(/```json|```/g, '').trim();
      items = JSON.parse(cleaned);
    } catch {
      return [];
    }

    return Promise.all(items.map((item: any) => this.create(tenantId, Object.assign(item, { targetDate: targetDate || null }))));
  }

  // ========== AI 7: 拖延提醒 ==========

  async nudge(tenantId: string | undefined): Promise<string> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const tasks = await this.taskRepo.find({
      where: { status: 'todo', tenantId: tenantId || null, createdAt: LessThan(threeDaysAgo) } as any,
      take: 5,
    });

    if (tasks.length === 0) return '没有需要催促的任务，继续保持！';

    const listText = tasks.map((t) => `- ${t.title}（已拖${Math.floor((Date.now() - t.createdAt.getTime()) / (24 * 60 * 60 * 1000))}天）`).join('\n');
    const prompt = `你是一个温和的拖延提醒助手。以下任务已经拖延了一段时间，请用轻松幽默的语气提醒用户开始行动，并给出简单的第一步建议。

${listText}`;

    return this.ai.ask(prompt);
  }

  // ========== Subtask + AI 8: 智能推荐 ==========

  async toggleSubtask(id: string): Promise<Subtask> {
    const subtask = await this.subtaskRepo.findOne({ where: { id } as any });
    if (!subtask) throw new Error('Subtask not found');
    subtask.completed = !subtask.completed;
    return this.subtaskRepo.save(subtask);
  }

  async recommend(tenantId: string | undefined): Promise<string> {
    const tasks = await this.taskRepo.find({
      where: { tenantId: tenantId || null } as any,
      relations: { subtasks: true } as any,
      order: { dueDate: 'ASC' },
    });

    const listText = tasks
      .map(
        (t) =>
          `- [${t.status}] ${t.title} | 优先级:${t.priority} | 截止:${t.dueDate || '无'} | 子任务:${t.subtasks?.length || 0}个 | 已完成:${t.subtasks?.filter((s) => s.completed).length || 0}个`,
      )
      .join('\n');

    const prompt = `你是一个智能任务推荐助手。根据以下所有任务状态，推荐用户今天接下来应该做的 1-3 个任务，并说明推荐理由。格式："🔮 推荐：任务名 — 理由"。

${listText || '暂无任务'}`;

    return this.ai.ask(prompt);
  }
}