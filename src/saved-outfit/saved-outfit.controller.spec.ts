import { Test, TestingModule } from '@nestjs/testing';
import { SavedOutfitController } from './saved-outfit.controller';

describe('SavedOutfitController', () => {
  let controller: SavedOutfitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedOutfitController],
    }).compile();

    controller = module.get<SavedOutfitController>(SavedOutfitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
