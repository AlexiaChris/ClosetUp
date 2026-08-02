import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClosetItemDto } from './dto/closetItemDto.dto';
import { removeBackground } from '@imgly/background-removal-node';
import * as fs from 'fs';

@Injectable()
export class ClosetService {
    constructor(private prisma: PrismaService) {}

    findAll() {
        return this.prisma.closetItem.findMany();
    }

    create(data: ClosetItemDto) {
        return this.prisma.closetItem.create({data});
    }

    async processUpload(file: Express.Multer.File, shouldRemoveBg: boolean) {
        let finalBuffer: Buffer = file.buffer;

        if (shouldRemoveBg) {
            const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
            const finalBlob = await removeBackground(blob);
            const arrayBuffer = await finalBlob.arrayBuffer();
            finalBuffer = Buffer.from(arrayBuffer);
        }

        fs.writeFileSync('test-output-finalBuffer.png', finalBuffer);

        return { 
            message: 'Processed', 
            bgRemoved: shouldRemoveBg 
        };
    }
}
