import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClosetItemDto } from './dto/closetItemDto.dto';
import { removeBackground } from '@imgly/background-removal-node';
import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';

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

        const imageUrl = await this.uploadToCloudinary(finalBuffer);
        const aiResult = await this.analyzeImage(finalBuffer, file.mimetype);
        const savedItem = await this.prisma.closetItem.create({
            data: {
                imageURL: imageUrl,
                category: aiResult.category,
                subcategory: aiResult.subcategory,
                color: aiResult.color,
                styleTags: aiResult.styleTags.join(','),
                formality: aiResult.formality,
            }
        })

        return savedItem;
    }

    async analyzeImage(buffer: Buffer, mimetype: string) {
        const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
        const base64img = buffer.toString('base64');

        const prompt = `Analyze this clothing/accessory item and return ONLY valid JSON, no other text, in this exact format:

        {
        "category": "top" | "bottom" | "shoes" | "outerwear" | "accessory",
        "subcategory": "specific type, e.g. sweater, jeans, sneakers, sunglasses, headphones",
        "color": "dominant color",
        "styleTags": [],
        "formality": "casual" | "smart casual" | "formal"
        }

        When a color is ambiguous between two categories (e.g. grey vs brown), prefer the cooler-toned label unless clearly warm-dominant.
        For style_tags: choose 1-3 styles ONLY if the item clearly matches the defining traits below. It's expected and fine for most items to match just 1 style. If an item is style-neutral/versatile and doesn't clearly signal any specific style (common for plain accessories, tech items, basics, or purely functional items), return an empty array — do NOT force-fit an item into a category it doesn't clearly match.

        - Casual: relaxed/loose fit, everyday basics, low-effort, no dressy details
        - Minimalist: fitted/structured basics, neutral colors, clean lines
        - Old Money: tailored, muted neutral tones, quiet luxury pieces (cable-knit, blazer, loafers)
        - Preppy: collared shirt/blouse, blazer or cardigan (navy/black/plaid), a-line or plaid mini skirt, knee-high socks, boots or loafers, headband, dark neutral palette, youthful school-uniform coded
        - Streetwear: oversized, graphic prints, sneakers, cargo
        - Grunge: earthy/muted washed tones, loose/rugged fit, flannel-adjacent
        - Emo: black-dominant palette, fitted, dark accessories (chains, studs)
        - Y2K: metallic, low-rise, glossy, logo-heavy, Y2K-era cuts
        - Vintage: retro-inspired cuts referencing 90s era
        - Cottagecore: earthy tones, floral/gingham, pastoral/romantic, linen/crochet texture
        - Academia: dark academic tones (burgundy, forest green), tweed/wool, literary/collegiate, turtleneck, long coat
        - Boho: flowy fabric, fringe, earthy prints, free-spirited silhouette
        - Coquette: sheer/lace fabric, ruffle & bow/ribbon detail, pastel palette (especially pink), delicate feminine silhouette`

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {text: prompt},
                        {inlineData: 
                            {
                            mimeType: mimetype,
                            data: base64img
                            }
                        }
                    ]
                }
            ]
        })

        const text = response.text;
        if (!text) {
            throw new Error(`Gemini didn't respond.`);
        }
        
        const cleaned = text.replace(/```json|```/g, '').trim();
        try {
            return JSON.parse(cleaned);
        }
        catch {
            throw new Error('Gemini returned wrong JSON.')
        }
    }

    async uploadToCloudinary(buffer:Buffer): Promise<string> {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const base64img = buffer.toString('base64');
        const dataUri = `data:image/png;base64,${base64img}`;

        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'closet_items'
        });

        return result.secure_url;
    }

    async generateOutfit(style?: string) {
        const allItems = await this.prisma.closetItem.findMany();

        const matchingItems = allItems.filter((item) => {
            if (!style) return true;
            const tags = item.styleTags.split(',');
            return tags.includes(style) || item.styleTags === '';
        });

        const tops = matchingItems.filter((i) => i.category === 'top');
        const bottoms = matchingItems.filter((i) => i.category === 'bottom');
        const outers = matchingItems.filter((i) => i.category === 'outerwear');
        const shoes = matchingItems.filter((i) => i.category === 'shoes');
        const accessories = matchingItems.filter((i) => i.category === 'accessory');

        const availableItems = matchingItems.filter((i) =>
            tops.includes(i) || bottoms.includes(i) || outers.includes(i) || shoes.includes(i) || accessories.includes(i)
        );
        const idsChosen = availableItems.length > 0 ? await this.pickBestCombo(availableItems, style) : null;

        return {
            top: tops.length > 0 ? matchingItems.find((i) => i.id === Number(idsChosen?.top)) : {message: 'No top available'},
            bottom: bottoms.length > 0 ? matchingItems.find((i) => i.id === Number(idsChosen?.bottom)) : {message: 'No bottom available'},
            outer: idsChosen?.outer ? matchingItems.find((i) => i.id === Number(idsChosen.outer)) : null,
            shoes: shoes.length > 0 ? matchingItems.find((i) => i.id === Number(idsChosen?.shoes)) : {message: 'No shoes available'},
            accessories: accessories.length > 0 ? matchingItems.filter((i) => idsChosen?.accessories?.map(Number).includes(i.id)) : [],
        };
    }

    async pickBestCombo(availableItems: any[], style?: string) {
        const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

        const simplifiedItems = availableItems.map(item => ({
            id: item.id,
            category: item.category,
            subcategory: item.subcategory,
            color: item.color,
            formality: item.formality
        }));

        const prompt = `You are a professional fashion stylist for gen Z and gen alpha (avoid outdated millennial styling). Look at this list of clothing items from a user's closet:
        ${JSON.stringify(simplifiedItems, null, 2)}

        Your task is to pick the best matching outfit combination. 
        Rules:
        1. You MUST select ONE "top" and ONE "bottom" and ONE "shoes" (if available in the list).
        2. "outer" is strictly OPTIONAL. Only choose an outer if it genuinely complements the top and bottom. If an outer ruins the outfit or isn't needed, set "outer" to null.
        3. "accessories" can be an array of item IDs (0 or more) that match, including matching metal tones (don't mix silver and gold in the same outfit), and matching the overall aesthetic/style, not just color and formality..
        4. ${style 
            ? `The user wants a "${style}" style outfit specifically — every piece you choose, including accessories, must fit that aesthetic. Do not include items that clash with or feel unrelated to "${style}", even if they match on color/formality alone.`
            : `No specific style was requested. Look at each item's styleTags to infer the dominant aesthetic among the best-matching top and bottom, then choose remaining pieces (shoes, accessories) that visually cohere with that aesthetic — even if their styleTags are empty or different, judge by silhouette/vibe compatibility. Avoid pairing pieces from clearly clashing aesthetics (e.g. delicate/feminine coquette pieces with sporty minimalist sneakers) unless the closet genuinely has no better option.`
        }
        5. Return ONLY valid JSON, no markdown formatting, no extra text, using this exact structure:

        {
            "top": "ID_OF_CHOSEN_TOP",
            "bottom": "ID_OF_CHOSEN_BOTTOM",
            "outer": "ID_OF_CHOSEN_OUTER_OR_NULL",
            "shoes": "ID_OF_CHOSEN_SHOES",
            "accessories": ["ID_1", "ID_2"]
        }`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: [
                {
                    role: 'user',
                    parts: [{text: prompt}]
                }
            ]
        });

        const text = response.text;
        if (!text) {
            throw new Error('Gemini failed to pick an outfit combination.');
        }

        const cleaned = text.replace(/```json|```/g, '').trim();
        try {
            return JSON.parse(cleaned);
        }
        catch {
            throw new Error('Gemini returned wrong JSON.')
        }
    }


}
