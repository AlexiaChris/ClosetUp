-- CreateTable
CREATE TABLE `ClosetItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `imageURL` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `subcategory` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `styleTags` VARCHAR(191) NOT NULL,
    `formality` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
