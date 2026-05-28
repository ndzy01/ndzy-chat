import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationController } from './conversation.controller';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TenantMiddleware } from './tenant.middleware';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Task } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      ssl: process.env.DB_SSL === 'true',
      entities: [Conversation, Message, Task, Subtask],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Conversation, Message, Task, Subtask]),
  ],
  controllers: [AppController, ConversationController, TaskController],
  providers: [AppService, TaskService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
