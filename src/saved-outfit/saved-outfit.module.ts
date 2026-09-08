import { Module } from '@nestjs/common';
import { SavedOutfitController } from './saved-outfit.controller';
import { SavedOutfitService } from './saved-outfit.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SavedOutfitController],
  providers: [SavedOutfitService]
})
export class SavedOutfitModule {}
