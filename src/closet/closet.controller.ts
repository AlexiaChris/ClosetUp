import { Controller, Post, Query, Get, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ClosetService } from './closet.service';
import { ClosetItemDto } from './dto/closetItemDto.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('closet')
export class ClosetController {
    private closetService;

    constructor(closetService: ClosetService) {
        this.closetService = closetService;
    }

    @Get()
    getService() {
        return this.closetService.findAll();
    }

    @Get('outfit/generate')
    generateOutfit(@Query('style') style?: string) {
        return this.closetService.generateOutfit(style);
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
