import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  // 从请求中获取文本参数，并传递给 appService.chat 方法
  async chat(
    @Query('text') text: string = 'Hello World',
  ): Promise<string | null> {
    return this.appService.chat(text);
  }
}
