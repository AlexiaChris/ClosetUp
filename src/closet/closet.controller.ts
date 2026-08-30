import { Controller, Post, Query, Get, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ClosetService } from './closet.service';
import { ClosetItemDto } from './dto/closetItemDto.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('closet')
export class ClosetController {
    private readonly closetService;

    constructor(closetService: ClosetService) {
        this.closetService = closetService;
    }

    @Get()
    getService() {
        return this.closetService.findAll();
    }

    @Get('outfit/generate')
    generateOutfit(
        @Query('style') style?: string,
        @Query('excludeIds') excludeIds?: string
    ) {
        const excludeIdsList = excludeIds ? excludeIds.split(',').map(Number) : undefined;
        return this.closetService.generateOutfit(style, excludeIdsList);
    }

    @Get('outfit/shuffle-category')
    shuffleCategory(
        @Query('category') category: 'top' | 'bottom' | 'shoes' | 'outer' | 'accessories',
        @Query('currentItemId') currentItemId: string,
        @Query('top') top?: string,
        @Query('bottom') bottom?: string,
        @Query('shoes') shoes?: string,
        @Query('outer') outer?: string,
        @Query('accessories') accessories?: string,
        @Query('style') style?: string
    ) {
        const lockedItems = {
            top: top ? Number(top) : undefined,
            bottom: bottom ? Number(bottom) : undefined,
            shoes: shoes ? Number(shoes) : undefined,
            outer: outer ? Number(outer) : undefined,
            accessories: accessories ? accessories.split(',').map(Number) : undefined
        }

        return this.closetService.shuffleCategory(category, Number(currentItemId), lockedItems, style);
    }

    @Get('outfit/shuffle-main-piece')
    shuffleMainPiece(
        @Query('currentOnePieceId') currentOnePieceId?: string,
        @Query('currentTopId') currentTopId?: string,
        @Query('currentBottomId') currentBottomId?: string,
        @Query('shoes') shoes?: string,
        @Query('outer') outer?: string,
        @Query('accessories') accessories?: string,
        @Query('style') style?: string
    ) {
        const lockedItems = {
            shoes: shoes ? Number(shoes) : undefined,
            outer: outer ? Number(outer) : undefined,
            accessories: accessories ? accessories.split(',').map(Number) : undefined
        };

        return this.closetService.shuffleMainPiece(
            currentOnePieceId ? Number(currentOnePieceId) : null,
            currentTopId ? Number(currentTopId) : null,
            currentBottomId ? Number(currentBottomId) : null,
            lockedItems,
            style
        );
    }

    @Post()
    postService(@Body() data: ClosetItemDto) {
        return this.closetService.create(data);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    uploadItem(
        @UploadedFile() file: Express.Multer.File,
        @Body('removeBg') removeBg: string,
    ) {
        return this.closetService.processUpload(file, removeBg === 'true');
    }


}
