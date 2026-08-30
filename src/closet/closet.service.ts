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
        "category": "one-piece" | "top" | "bottom" | "shoes" | "outerwear" | "accessory",
        "subcategory": "specific type, e.g. sweater, jeans, sneakers, sunglasses, headphones",
        "color": "dominant color",
        "styleTags": [],
        "formality": "casual" | "smart casual" | "formal"
        }

        Use "one-piece" for any single garment that covers both top and bottom of the body in one piece (dresses, jumpsuits, rompers, overalls), do NOT tag these as "top" or "bottom".
        When a color is ambiguous between two categories (e.g. grey vs brown), prefer the cooler-toned label unless clearly warm-dominant.
        For style_tags: choose 1-3 styles that clearly match the defining traits below. Most items will match 1 style, but versatile everyday basics (plain jeans, plain t-shirts, simple sneakers, etc.) should include "Casual" as an additional tag even if they also match a more specific aesthetic. 
        Do not default to an empty styleTags array just because an item isn't a clear single match. Jewelry, shoes, and bags almost always carry SOME aesthetic signal (formality, metal tone, silhouette), make your best-guess tag based on those cues. Only leave styleTags empty for genuinely style-neutral functional items (tech accessories, plain ring, etc.).

        - Casual: relaxed/loose fit, everyday basics, low-effort, no dressy details. This tag is not mutually exclusive with other styles, a plain, versatile piece (basic jeans, plain white tee, simple sneakers) that also fits another aesthetic should still get "Casual" included alongside that aesthetic, since it reflects genuine everyday wearability.
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

    async generateOutfit(style?: string, excludeIds: number[] = []) {
        const allItems = await this.prisma.closetItem.findMany();

        const matchingItems = allItems.filter((item) => {
            if (!style) return true;
            const styleLower = style.toLowerCase();
            const tags = item.styleTags.split(',').map(t => t.trim().toLowerCase());
            return tags.includes(styleLower ) || item.styleTags === '';
        });

        const onePieces = matchingItems.filter((i) => i.category === 'one-piece');
        const tops = matchingItems.filter((i) => i.category === 'top');
        const bottoms = matchingItems.filter((i) => i.category === 'bottom');
        const outers = matchingItems.filter((i) => i.category === 'outerwear');
        const shoes = matchingItems.filter((i) => i.category === 'shoes');
        const accessories = matchingItems.filter((i) => i.category === 'accessory');

        const availOnePieces = onePieces.filter((i) => !excludeIds.includes(i.id)); 
        const availTops = tops.filter((i) => !excludeIds.includes(i.id)); 
        const availBottoms = bottoms.filter((i) => !excludeIds.includes(i.id));  

        const canGenerateMainPiece = availOnePieces.length > 0 || (availTops.length > 0 && availBottoms.length > 0);

        let updatedExcludeIds = excludeIds;
        let didReset = false;

        if (!canGenerateMainPiece) {
            updatedExcludeIds = [];
            didReset = true;
        }

        const noAltCategories: string[] = [];   // category yang gaada pengganti nya

        const removeUsedItems = (categoryItems: any[], categoryLabel: string) => {
            if (updatedExcludeIds.length === 0) return categoryItems;

            const remainingItems = categoryItems.filter((i) => !updatedExcludeIds.includes(i.id));

            if (remainingItems.length === 0 && categoryItems.length > 0) {
                noAltCategories.push(categoryLabel);
                return categoryItems;   // pake item yg lama
            }

            return remainingItems;
        };

        const finalAvailOnePieces = removeUsedItems(onePieces, 'one-piece');
        const finalAvailTops = removeUsedItems(tops, 'top'); 
        const finalAvailBottoms = removeUsedItems(bottoms, 'bottom'); 
        const finalAvailShoes = removeUsedItems(shoes, 'shoes'); 
        const finalAvailOuters = removeUsedItems(outers, 'outer');
        const finalAvailAccessories = removeUsedItems(accessories, 'accessories');

        const availableItems = [...finalAvailOnePieces, ...finalAvailTops, ...finalAvailBottoms, ... finalAvailShoes,... finalAvailOuters, ...finalAvailAccessories];

        const idsChosen = availableItems.length > 0 ? await this.pickBestCombo(availableItems, style) : null;  

        return {
            onePiece: idsChosen?.onePiece ? availableItems.find((i) => i.id === Number(idsChosen?.onePiece)) : null,
            top: idsChosen?.top ? availableItems.find((i) => i.id === Number(idsChosen?.top)) : (availOnePieces.length === 0 && availTops.length === 0 ? {message: 'No top or one-piece available'} : null),
            bottom: idsChosen?.bottom ? availableItems.find((i) => i.id === Number(idsChosen?.bottom)) : (availOnePieces.length === 0 && availBottoms.length === 0 ? {message: 'No bottom or one-piece available'} : null),
            outer: idsChosen?.outer ? availableItems.find((i) => i.id === Number(idsChosen.outer)) : null,
            shoes: finalAvailShoes.length > 0 ? availableItems.find((i) => i.id === Number(idsChosen?.shoes)) : {message: 'No shoes available'},
            accessories: finalAvailAccessories.length > 0 ? availableItems.filter((i) => idsChosen?.accessories?.map(Number).includes(i.id)) : [],
            noAlternative: noAltCategories,
            didReset,
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
        1. For the main outfit piece, you MUST choose EXACTLY ONE of these two options:
            (a) ONE "one-piece" item (dress/jumpsuit/romper), OR
            (b) ONE "top" AND ONE "bottom" together.
            Never choose a one-piece together with a top or bottom. If a one-piece is available and is a strong match, prefer it when it best fits the outfit, otherwise use top+bottom.
        2. MUST select one shoes (if available in the list).
        3. "outer" is strictly OPTIONAL. Only choose an outer if it genuinely complements the top and bottom. If an outer ruins the outfit or isn't needed, set "outer" to null.
        4. "accessories" can be an array of item IDs (0 or more) that match, including matching metal tones (don't mix silver and gold in the same outfit), and matching the overall aesthetic/style, not just color and formality..
        CRITICAL METAL RULE: Do NOT mix silver-toned and gold-toned accessories in the same outfit. If you pick more than one accessory, all of them must share the same metal tone (all silver, or all gold, or metal-neutral items like fabric/leather).
        5. ${style 
            ? `The user wants a "${style}" style outfit specifically — every piece you choose, including accessories, must fit that aesthetic. Do not include items that clash with or feel unrelated to "${style}", even if they match on color/formality alone.`
            : `No specific style was requested. Look at each item's styleTags to infer the dominant aesthetic among the best-matching top and bottom, then choose remaining pieces (shoes, accessories) that visually cohere with that aesthetic — even if their styleTags are empty or different, judge by silhouette/vibe compatibility. Avoid pairing pieces from clearly clashing aesthetics (e.g. delicate/feminine coquette pieces with sporty minimalist sneakers) unless the closet genuinely has no better option.`
        }
        6. Items with empty styleTags are NOT automatically safe choices, treat them as neutral candidates only if their formality and visual character (color, silhouette from subcategory) plausibly fit the target style. When a styled alternative exists in the same category, prefer the item that matches the formality more.
        7. Return ONLY valid JSON, no markdown formatting, no extra text, using this exact structure:

        {
            "onePiece": "ID_OR_NULL",
            "top": "ID_OR_NULL",
            "bottom": "ID_OR_NULL",
            "outer": "ID_OR_NULL",
            "shoes": "ID",
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

    async shuffleMainPiece(
        currentOnePieceId: number | null,
        currentTopId: number | null,
        currentBottomId: number | null,
        lockedItems: {shoes?: number, outer?: number, accessories?: number[]},
        style?: string
    ) {
        const allItems = await this.prisma.closetItem.findMany();

        const matchingItems = allItems.filter((item) => {
            if (!style) return true;
            const styleLower = style.toLowerCase();
            const tags = item.styleTags.split(',').map(t => t.trim().toLowerCase());
            return tags.includes(styleLower ) || item.styleTags === '';
        });

        const excludeIds = [currentOnePieceId, currentBottomId, currentTopId].filter((id): id is number => id !== null);

        const onePieceCandidates = matchingItems.filter((i) => i.category === 'one-piece' && !excludeIds.includes(i.id));
        const topCandidates = matchingItems.filter((i) => i.category === 'top' && !excludeIds.includes(i.id));
        const bottomCandidates = matchingItems.filter((i) => i.category === 'bottom' && !excludeIds.includes(i.id));

        const candidates = [...onePieceCandidates, ...topCandidates, ...bottomCandidates];

        if (candidates.length === 0) {
            return {message: 'No other top/bottom/one-piece combination available'}
        }

        return this.pickMainPieceReplacement(candidates, lockedItems, style);
    }

    async pickMainPieceReplacement(
        candidates: any[],
        lockedItems: {shoes?: number, outer?: number, accessories?: number[]},
        style?: string
    ) {
        const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

        const lockedIds = [lockedItems.shoes, lockedItems.outer, ...(lockedItems.accessories ?? [])].filter((id): id is number => id !== undefined);
        const lockedItemsData = lockedIds.length > 0 ? await this.prisma.closetItem.findMany({where: {id: {in: lockedIds}}}) : [];

        const simplifiedCandidates = candidates.map((item) => ({
            id: item.id,
            category: item.category,
            subcategory: item.subcategory,
            color: item.color,
            formality: item.formality,
            styleTags: item.styleTags,
        }));

        const simplifiedLocked = lockedItemsData.map((item) => ({
            category: item.category,
            subcategory: item.subcategory,
            color: item.color,
            formality: item.formality,
            styleTags: item.styleTags,
        }));

        const prompt = `You are a professional fashion stylist for gen Z and gen alpha.
        The user is currently wearing this outfit (excluding the main piece, which they want to replace): ${JSON.stringify(simplifiedLocked, null, 2)}

        They want a new main outfit piece. Here are the available candidates (a mix of one-piece garments and separate tops/bottoms): ${JSON.stringify(simplifiedCandidates, null, 2)}

        Choose EXACTLY ONE of:
        (a) ONE "one-piece" item, OR
        (b) ONE "top" AND ONE "bottom" together.
        Pick whichever best complements the rest of the outfit above${style ? ` and fits the "${style}" style` : ''}.

        Return ONLY valid JSON, no markdown formatting, no extra text:
        { 
            "onePiece": "ID_OR_NULL", 
            "top": "ID_OR_NULL", 
            "bottom": "ID_OR_NULL" 
        }`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: [{
                role: "user",
                parts: [{text: prompt}]
            }]
        });

        const text = response.text;
        if (!text) {
            throw new Error('Gemini failed to pick a new main piece.')
        }

        const cleaned = text.replace(/```json|```/g, '').trim();
        let parsed: any;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new Error('Gemini returned wrong JSON.');
        }

        return {
            onePiece: parsed.onePiece ? candidates.find((item) => item.id === Number(parsed.onePiece)) : null,
            top: parsed.top ? candidates.find((item) => item.id === Number(parsed.top)): null,
            bottom: parsed.bottom ? candidates.find((item) => item.id === Number(parsed.bottom)) : null
        }
    }

    async shuffleCategory(
        category: 'top' | 'bottom' | 'shoes' | 'outer' | 'accessories',
        currentItemId: number,
        lockedItems: {top?: number, bottom?: number, shoes?: number, outer?: number, accessories?: number[]},
        style?: string
    ) {
        const allItems = await this.prisma.closetItem.findMany();
        const dbCategory = category === 'accessories' ? 'accessory' : category;

        const matchingCategory = allItems.filter((item) => {
            if (item.category !== dbCategory) return false;
            if (!style) return true;
            const styleLower = style.toLowerCase();
            const tags = item.styleTags.split(',').map(t => t.trim().toLowerCase());
            return tags.includes(styleLower ) || item.styleTags === '';
        });

        const candidates = matchingCategory.filter((item) => item.id !== currentItemId);
        if (candidates.length === 0) {
            return matchingCategory.find((item) => item.id === currentItemId) ?? { message: `No other ${category} available` };
        }

        return this.pickReplacementItem(category, candidates, lockedItems, style);
    }

    async pickReplacementItem(
        category: 'top' | 'bottom' | 'shoes' | 'outer' | 'accessories',
        candidates: any[],
        lockedItems: {top?: number, bottom?: number, shoes?: number, outer?: number, accessories?: number[]},
        style?: string
    ) {
        const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

        const lockedIds = [lockedItems.top, lockedItems.bottom, lockedItems.shoes, lockedItems.outer, ...(lockedItems.accessories ?? [])].filter((id): id is number => id !== undefined);

        const lockedItemsData = lockedIds.length > 0 ? await this.prisma.closetItem.findMany({where: {id: {in: lockedIds}}}) : [];

        const simplifiedCandidates = candidates.map((item) => ({
            id: item.id,
            subcategory: item.subcategory,
            color: item.color,
            formality: item.formality,
            styleTags: item.styleTags,
        }));

        const simplifiedLocked = lockedItemsData.map((item) => ({
            category: item.category,
            subcategory: item.subcategory,
            color: item.color,
            formality: item.formality,
            styleTags: item.styleTags
        }));

        const prompt = `You are a professional fashion stylist for gen Z and gen alpha (avoid outdated millennial styling).

        The user is currently wearing this outfit: ${JSON.stringify(simplifiedLocked, null, 2)}

        They want to replace their "${category}" with a different item. Here are the available candidates:
        ${JSON.stringify(simplifiedCandidates, null, 2)}

        ${style 
            ? `The user wants this outfit to stay in the "${style}" style — pick the candidate that best fits both "${style}" and the rest of the outfit above.`
            : `Pick the candidate that best complements the rest of the outfit above in color, formality, and overall aesthetic coherence.`
        }

        Return ONLY valid JSON, no markdown formatting, no extra text, using this exact structure:
        { "chosenId": "ID_OF_CHOSEN_ITEM" }`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: [{
                role: "user",
                parts: [{text: prompt}]
            }]
        });

        const text = response.text;
        if (!text) {
            throw new Error('Gemini failed to pick a new replacemnet item.');
        }

        const cleaned = text.replace(/```json|```/g, '').trim();
        let parsed: any;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new Error('Gemini returned wrong JSON.');
        }

        return candidates.find((item) => item.id === Number(parsed.chosenId));
    }


}
