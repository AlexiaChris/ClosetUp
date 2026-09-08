import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { SavedOutfitService } from './saved-outfit.service';
import { SavedOutfitDto } from './dto/savedOutfitDto.dto';

@Controller('saved-outfit')
export class SavedOutfitController {
    private readonly savedOutfitService;

    constructor(savedOutfitService: SavedOutfitService) {
        this.savedOutfitService = savedOutfitService;
    }

    @Post('folder')
    createFolder(@Body('name') name?: string) {
        return this.savedOutfitService.createFolder(name);
    }
    
    @Get('folder')
    getAllFolders() {
        return this.savedOutfitService.getAllFolders();
    }

    @Post()
    saveOutfit(@Body() data: SavedOutfitDto) {
        return this.savedOutfitService.saveOutfit(data);
    } 

    @Get()
    getAllSavedOutfits() {
        return this.savedOutfitService.getAllSavedOutfits();
    }

    @Get('folder/:folderId')
    getOutfitsByFolder(@Param('folderId') folderId: string) {
        return this.savedOutfitService.getOutfitsByFolder(Number(folderId));
    }

    @Post(':outfitId/folder/:folderId') 
    addOutfitToFolder(@Param('outfitId') outfitId: string, @Param('folderId') folderId: string) {
        return this.savedOutfitService.addOutfitToFolder(Number(outfitId), Number(folderId));
    }

    @Delete(':outfitId/folder/:folderId')
    removeOutfitFromFolder(@Param('outfitId') outfitId: string, @Param('folderId') folderId: string) {
        return this.savedOutfitService.removeOutfitFromFolder(Number(outfitId), Number(folderId));
    }

    @Delete(':outfitId')
    deleteSavedOutfit(@Param('outfitId') outfitId: string) {
        return this.savedOutfitService.deleteSavedOutfit(Number(outfitId));
    }
    
    @Delete('folder/:folderId') 
    deleteFolder(@Param('folderId') folderId: string) {
        return this.savedOutfitService.deleteFolder(Number(folderId));
    }
}
