-- CreateTable
CREATE TABLE `SavedOutfit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `onePieceId` INTEGER NULL,
    `topId` INTEGER NULL,
    `bottomId` INTEGER NULL,
    `shoesId` INTEGER NULL,
    `outerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SavedOutfitAccessory` (
    `outfitId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,

    PRIMARY KEY (`outfitId`, `itemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Folder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutfitFolder` (
    `outfitId` INTEGER NOT NULL,
    `folderId` INTEGER NOT NULL,

    PRIMARY KEY (`outfitId`, `folderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SavedOutfit` ADD CONSTRAINT `SavedOutfit_onePieceId_fkey` FOREIGN KEY (`onePieceId`) REFERENCES `ClosetItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedOutfit` ADD CONSTRAINT `SavedOutfit_topId_fkey` FOREIGN KEY (`topId`) REFERENCES `ClosetItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedOutfit` ADD CONSTRAINT `SavedOutfit_bottomId_fkey` FOREIGN KEY (`bottomId`) REFERENCES `ClosetItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedOutfit` ADD CONSTRAINT `SavedOutfit_shoesId_fkey` FOREIGN KEY (`shoesId`) REFERENCES `ClosetItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedOutfit` ADD CONSTRAINT `SavedOutfit_outerId_fkey` FOREIGN KEY (`outerId`) REFERENCES `ClosetItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedOutfitAccessory` ADD CONSTRAINT `SavedOutfitAccessory_outfitId_fkey` FOREIGN KEY (`outfitId`) REFERENCES `SavedOutfit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedOutfitAccessory` ADD CONSTRAINT `SavedOutfitAccessory_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ClosetItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutfitFolder` ADD CONSTRAINT `OutfitFolder_outfitId_fkey` FOREIGN KEY (`outfitId`) REFERENCES `SavedOutfit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutfitFolder` ADD CONSTRAINT `OutfitFolder_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `Folder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
