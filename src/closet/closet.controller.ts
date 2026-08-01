import { Controller, Post } from '@nestjs/common';
import { Get, Body } from '@nestjs/common';
import { ClosetService } from './closet.service';
import { ClosetItemDto } from './dto/closetItemDto.dto';

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

}
