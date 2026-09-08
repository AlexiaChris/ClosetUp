import { Test, TestingModule } from '@nestjs/testing';
import { SavedOutfitService } from './saved-outfit.service';

describe('SavedOutfitService', () => {
  let service: SavedOutfitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SavedOutfitService],
    }).compile();

    service = module.get<SavedOutfitService>(SavedOutfitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
