import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './socket';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppGateway, AppService],
})
export class AppModule {}
