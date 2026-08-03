import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClosetItemDto } from './dto/closetItemDto.dto';
import { removeBackground } from '@imgly/background-removal-node';
import * as fs from 'fs';
import { GoogleGenAI } from '@google/genai';

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

        const aiResult = await this.analyzeImage(finalBuffer, file.mimetype);
        const savedItem = await this.prisma.closetItem.create({
            data: {
                imageURL: 'placeholder.jpg',
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
  "category": "top" | "bottom" | "shoes" | "accessories",
  "subcategory": "specific type, e.g. sweater, jeans, sneakers, sunglasses, headphones",
  "color": "dominant color",
  "styleTags": [],
  "formality": "casual" | "smart casual" | "formal"
}

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
            throw new Error(`Gemini didn't respond`);
        }
        return JSON.parse(text);
    }
}
