import { Injectable } from '@nestjs/common';

@Injectable()
export class ClosetService {
    findAll() {
        return [{ id: '1', category: 'top', subcategory: 'hoodie', color: 'red' }]
    }
}
