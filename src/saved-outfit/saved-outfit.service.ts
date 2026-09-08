import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SavedOutfitDto } from './dto/savedOutfitDto.dto';

@Injectable()
export class SavedOutfitService {
    constructor(private prisma: PrismaService) {}

    async createFolder(name?: string) {
        const newFolder = await this.prisma.folder.create({
            data: {name: name || 'temp'}
        })

        if (!name) {
            return this.prisma.folder.update({
                where: {id: newFolder.id},
                data: {name: `Folder #${newFolder.id}`}
            });
        }

        return newFolder;
    }

    async getAllFolders() {
        return this.prisma.folder.findMany({
            orderBy: {createdAt: 'desc'}
        })
    }

    async saveOutfit(data: SavedOutfitDto) {
        const savedOutfit = await this.prisma.savedOutfit.create({
            data: {
                name: data.name,
                onePieceId: data.onePieceId,
                topId: data.topId,
                bottomId: data.bottomId,
                outerId: data.outerId,
                shoesId: data.shoesId
            }
        });

        if (data.accessoryIds && data.accessoryIds.length > 0) {
            await this.prisma.savedOutfitAccessory.createMany({
                data: data.accessoryIds.map((itemId) => ({
                    outfitId: savedOutfit.id,
                    itemId
                }))
            });
        }

        if (data.folderIds && data.folderIds.length > 0) {
            await this.prisma.outfitFolder.createMany({
                data: data.folderIds.map((folderId) => ({
                    outfitId: savedOutfit.id,
                    folderId
                }))
            });
        }

        return savedOutfit;
    }

    async getAllSavedOutfits() {
        const outfits = await this.prisma.savedOutfit.findMany({
            include: {
                onePiece: true,
                top: true,
                bottom: true,
                shoes: true,
                outer: true,
                accessories: {include: {item: true}}
            },
            orderBy: {createdAt: 'desc'}
        });

        return outfits.map((i) => ({
            ...i,
            accessories: i.accessories.map((a) => a.item)
        }));
    }

    async getOutfitsByFolder(folderId: number) {
        const folder = await this.prisma.folder.findUnique({
            where: {id: folderId},
            include: {
                outfits: {
                    include: {
                        outfit: {
                            include: {
                                onePiece: true,
                                top: true,
                                bottom: true,
                                shoes: true,
                                outer: true,
                                accessories: {include: {item: true}}
                            }
                        }
                    }
                }
            }
        });

        if (!folder) {
            return {message: 'No folders found.'};
        }

        return folder.outfits.map((i) => ({
            ...i.outfit,
            accessories: i.outfit.accessories.map((a) => a.item)
        }));
    }

    async addOutfitToFolder(outfitId: number, folderId: number) {
        return this.prisma.outfitFolder.create({
            data: {outfitId, folderId}
        });
    }

    async removeOutfitFromFolder(outfitId: number, folderId: number) {
        return this.prisma.outfitFolder.delete({
            where: {outfitId_folderId: {
                outfitId, 
                folderId
            }}
        });
    }

    async deleteSavedOutfit(outfitId: number) {
        await this.prisma.outfitFolder.deleteMany({
            where: {outfitId}
        });
        await this.prisma.savedOutfitAccessory.deleteMany({
            where: {outfitId}
        });

        return this.prisma.savedOutfit.delete({
            where: {id: outfitId}
        });
    }

    async deleteFolder(folderId: number) {
        await this.prisma.outfitFolder.deleteMany({
            where: {folderId}
        });

        return this.prisma.folder.delete({
            where: {id: folderId}
        })
    }
}
