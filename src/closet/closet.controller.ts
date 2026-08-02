import { Controller, Post } from '@nestjs/common';
import { Get, Body } from '@nestjs/common';
import { ClosetService } from './closet.service';
import { ClosetItemDto } from './dto/closetItemDto.dto';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
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
