import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClosetModule } from './closet/closet.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { SavedOutfitModule } from './saved-outfit/saved-outfit.module';

@Module({
  imports: [ClosetModule, PrismaModule, SavedOutfitModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
