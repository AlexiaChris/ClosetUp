import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClosetItemDto } from './dto/closetItemDto.dto';

@Injectable()
export class ClosetService {
    constructor(private prisma: PrismaService) {}

    findAll() {
        return this.prisma.closetItem.findMany();
    }

    create(data: ClosetItemDto) {
        return this.prisma.closetItem.create({data});
    }
}
