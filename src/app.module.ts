import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationController } from './conversation.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      port: 5432,
      host: 'ep-steep-mode-a5wine1e-pooler.us-east-2.aws.neon.tech',
      username: 'neondb_owner',
      password: 'npg_wXFEzyiYD7R2',
      database: 'neondb',
      ssl: true,
      entities: [Conversation, Message],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Conversation, Message]),
  ],
  controllers: [AppController, ConversationController],
  providers: [AppService],
})
export class AppModule {}
