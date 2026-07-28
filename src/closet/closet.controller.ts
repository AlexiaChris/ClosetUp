import { Controller } from '@nestjs/common';
import { Get } from '@nestjs/common';
import { ClosetService } from './closet.service';

@Controller('closet')
export class ClosetController {
    private closetService;

    constructor(closetService: ClosetService) {
        this.closetService = closetService;
    }

    @Get()
    getService() {
        return this.closetService.findAll()
    }
}
