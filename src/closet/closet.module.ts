import { Module } from '@nestjs/common';
import { ClosetController } from './closet.controller';
import { ClosetService } from './closet.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ClosetController],
  providers: [ClosetService],
  imports: [PrismaModule],
})
export class ClosetModule {}
