import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClosetModule } from './closet/closet.module';

@Module({
  imports: [ClosetModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
