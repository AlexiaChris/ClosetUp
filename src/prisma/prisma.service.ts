import { Injectable } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        const adapter = new PrismaMariaDb({
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: '',
            database: 'closetup_db',
            connectionLimit: 5,
            ssl: false,
        });
        super({adapter});
    }
    
    async onModuleInit() {
        await this.$connect();
    }
}
