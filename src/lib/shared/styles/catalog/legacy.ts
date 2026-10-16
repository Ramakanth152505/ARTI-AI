/**
 * Legacy image-style records, preserved verbatim from the original image catalogue.
 *
 * These records pre-date the shared catalogue: they carry no `mediaTypes` or
 * `execution` field. `catalog/index.ts` normalises them into full `Style`
 * records instead of rewriting the data, so the original wording is preserved
 * exactly and nothing silently changes meaning.
 */

export interface LegacyStyle {
        id: string;
        name: string;
        categoryId: string;
        summary: string;
        promptTemplate: string;
        negativeTemplate?: string;
        preferredAspectRatios?: string[];
        hints?: string[];
        keywords?: string[];
        verified?: boolean;
}

export const LEGACY_IMAGE_STYLES: LegacyStyle[] = [
        // --- Photography ---
        {
                id: 'cinematic-photorealism',
                name: 'Cinematic Photorealism',
                categoryId: 'photography',
                summary: 'Film-still realism with physically plausible light.',
                promptTemplate:
                        'Render as a cinematic, photorealistic image with physically plausible lighting, realistic materials, carefully controlled composition, natural detail and a coherent visual atmosphere.',
                negativeTemplate: 'cartoon, illustration, painting, cgi, low detail, deformed',
                preferredAspectRatios: ['16:9', '3:2'],
                keywords: ['realistic', 'film', 'photo', 'documentary']
        },
        {
                id: 'portrait-studio',
                name: 'Studio Portrait',
                categoryId: 'photography',
                summary: 'Controlled studio lighting on a single subject.',
                promptTemplate:
                        'Render as a professional studio portrait: soft key and rim lighting, shallow depth of field, clean background, natural skin texture and precise focus on the subject.',
                preferredAspectRatios: ['4:5', '2:3'],
                keywords: ['portrait', 'headshot', 'studio', 'people']
        },
        {
                id: 'golden-hour',
                name: 'Golden Hour',
                categoryId: 'photography',
                summary: 'Warm low-sun light and long soft shadows.',
                promptTemplate:
                        'Render with warm golden-hour light: a low sun, long soft shadows, glowing highlights, gentle atmospheric haze and natural, saturated warm tones.',
                preferredAspectRatios: ['3:2', '16:9'],
                keywords: ['sunset', 'warm', 'outdoor', 'natural light']
        },
        {
                id: 'black-and-white',
                name: 'Monochrome',
                categoryId: 'photography',
                summary: 'High-contrast black-and-white photography.',
                promptTemplate:
                        'Render as a black-and-white photograph with a full tonal range, strong contrast, rich blacks, clean highlights and deliberate use of shape and texture.',
                preferredAspectRatios: ['1:1', '3:2'],
                keywords: ['mono', 'greyscale', 'contrast', 'classic']
        },
        {
                id: 'product-photography',
                name: 'Product Photography',
                categoryId: 'photography',
                summary: 'Clean commercial lighting for a single product.',
                promptTemplate:
                        'Render as a commercial product photograph: precise studio lighting, controlled reflections, seamless neutral background, accurate materials and sharp edge detail on the product.',
                preferredAspectRatios: ['1:1', '4:5'],
                keywords: ['product', 'commercial', 'ecommerce', 'packshot']
        },
        {
                id: 'macro-nature',
                name: 'Macro Nature',
                categoryId: 'photography',
                summary: 'Extreme close-up detail of natural subjects.',
                promptTemplate:
                        'Render as a macro nature photograph: extreme close-up detail, shallow depth of field, soft natural light, visible surface texture and a defocused background.',
                preferredAspectRatios: ['1:1', '3:2'],
                keywords: ['macro', 'close-up', 'insect', 'plant']
        },

        // --- Cinematic ---
        {
                id: 'neo-noir',
                name: 'Neo-Noir',
                categoryId: 'cinematic',
                summary: 'Moody low-key lighting and deep shadow.',
                promptTemplate:
                        'Render in a neo-noir cinematic style: low-key lighting, deep shadows, hard directional light, moody atmosphere, restrained desaturated palette and strong silhouette.',
                preferredAspectRatios: ['16:9', '2:3'],
                keywords: ['noir', 'dark', 'moody', 'shadow']
        },
        {
                id: 'epic-cinematic',
                name: 'Epic Cinematic',
                categoryId: 'cinematic',
                summary: 'Large-scale, high-contrast film composition.',
                promptTemplate:
                        'Render as an epic cinematic frame: dramatic wide composition, volumetric light, deep colour grading, atmospheric depth and a sense of grand scale.',
                preferredAspectRatios: ['16:9', '2:3'],
                keywords: ['epic', 'blockbuster', 'dramatic', 'wide']
        },
        {
                id: 'anamorphic-lens',
                name: 'Anamorphic Lens',
                categoryId: 'cinematic',
                summary: 'Cinema lens look with flares and bokeh.',
                promptTemplate:
                        'Render with an anamorphic cinema lens look: gentle horizontal flares, oval bokeh, subtle lens distortion, shallow focus and filmic colour response.',
                preferredAspectRatios: ['16:9'],
                keywords: ['lens flare', 'bokeh', 'cinema', 'film']
        },

        // --- Digital art ---
        {
                id: 'digital-painting',
                name: 'Digital Painting',
                categoryId: 'digital-art',
                summary: 'Painted digital artwork with visible brushwork.',
                promptTemplate:
                        'Render as a digital painting with confident visible brushwork, layered shading, rich local colour, deliberate edge control and a painted light source.',
                keywords: ['painting', 'brushes', 'digital', 'art']
        },
        {
                id: 'concept-art',
                name: 'Concept Art',
                categoryId: 'digital-art',
                summary: 'Production-style design artwork for worlds and props.',
                promptTemplate:
                        'Render as production concept art: a clear design read, strong silhouettes, functional detail, atmospheric background and a consistent art direction.',
                preferredAspectRatios: ['16:9', '3:2'],
                keywords: ['concept', 'design', 'production', 'worldbuilding']
        },
        {
                id: 'matte-painting',
                name: 'Matte Painting',
                categoryId: 'digital-art',
                summary: 'Painterly environment art with cinematic depth.',
                promptTemplate:
                        'Render as a matte painting: painterly environment detail, layered atmospheric depth, cinematic scale, integrated light and a coherent colour script.',
                preferredAspectRatios: ['16:9'],
                keywords: ['environment', 'matte', 'background', 'vfx']
        },

        // --- 3D ---
        {
                id: 'octane-render',
                name: 'Studio 3D Render',
                categoryId: '3d',
                summary: 'Clean physically-based 3D rendering.',
                promptTemplate:
                        'Render as a high-quality physically based 3D render: accurate global illumination, subtle ambient occlusion, realistic materials and a clean studio lighting setup.',
                keywords: ['3d', 'render', 'octane', 'pbr']
        },
        {
                id: 'stylised-3d',
                name: 'Stylised 3D',
                categoryId: '3d',
                summary: 'Soft, appealing 3D with a storybook finish.',
                promptTemplate:
                        'Render as a stylised 3D illustration: soft rounded forms, appealing proportions, gentle global illumination, subsurface warmth and a polished storybook finish.',
                keywords: ['3d', 'cute', 'stylised', 'animation']
        },
        {
                id: 'clay-render',
                name: 'Clay Render',
                categoryId: '3d',
                summary: 'Monochrome clay form study.',
                promptTemplate:
                        'Render as a monochrome clay model: matte untextured surface, soft neutral studio light, gentle occlusion and a focus on pure form and silhouette.',
                keywords: ['clay', 'sculpt', 'neutral', 'form']
        },

        // --- Illustration ---
        {
                id: 'editorial-illustration',
                name: 'Editorial Illustration',
                categoryId: 'illustration',
                summary: 'Publication-ready conceptual illustration.',
                promptTemplate:
                        'Render as an editorial illustration: a clear conceptual metaphor, confident shapes, limited purposeful palette, intelligent negative space and a refined finish.',
                keywords: ['editorial', 'magazine', 'concept', 'vector']
        },
        {
                id: 'childrens-book',
                name: "Children's Book",
                categoryId: 'illustration',
                summary: 'Warm, gentle illustration for young readers.',
                promptTemplate:
                        'Render as a children’s book illustration: warm friendly shapes, soft textures, gentle lighting, expressive characters and a cosy inviting mood.',
                keywords: ['children', 'storybook', 'warm', 'friendly']
        },
        {
                id: 'technical-illustration',
                name: 'Technical Illustration',
                categoryId: 'illustration',
                summary: 'Precise explanatory line and cutaway drawings.',
                promptTemplate:
                        'Render as a technical illustration: precise clean linework, accurate proportions, clear call-outs, restrained palette and an instructional, legible layout.',
                keywords: ['technical', 'diagram', 'engineering', 'blueprint']
        },
        {
                id: 'ink-linework',
                name: 'Ink Linework',
                categoryId: 'illustration',
                summary: 'Bold ink contours with hatching.',
                promptTemplate:
                        'Render as an ink drawing: confident bold contour lines, cross-hatched shading, high contrast and a handmade pen-and-ink quality.',
                keywords: ['ink', 'lineart', 'hatching', 'pen']
        },

        // --- Painting & traditional ---
        {
                id: 'watercolour',
                name: 'Watercolour',
                categoryId: 'traditional',
                summary: 'Translucent washes and soft bleeds.',
                promptTemplate:
                        'Render as a watercolour painting: translucent layered washes, soft bleeding edges, visible paper texture, restrained palette and areas of unpainted white.',
                keywords: ['watercolour', 'washes', 'paper', 'soft']
        },
        {
                id: 'oil-painting',
                name: 'Oil Painting',
                categoryId: 'traditional',
                summary: 'Rich impasto oil with visible strokes.',
                promptTemplate:
                        'Render as an oil painting: rich layered pigment, visible brush and palette-knife strokes, warm glazing, deep shadows and a varnished classical finish.',
                keywords: ['oil', 'impasto', 'classical', 'canvas']
        },
        {
                id: 'pencil-sketch',
                name: 'Pencil Sketch',
                categoryId: 'traditional',
                summary: 'Graphite drawing with tonal study.',
                promptTemplate:
                        'Render as a graphite pencil sketch: fine pencil hatching, careful tonal modelling, visible paper grain and a light construction-line quality.',
                keywords: ['sketch', 'pencil', 'graphite', 'drawing']
        },
        {
                id: 'charcoal',
                name: 'Charcoal Study',
                categoryId: 'traditional',
                summary: 'Soft charcoal with dramatic tonal contrast.',
                promptTemplate:
                        'Render as a charcoal drawing: soft smudged passages, dramatic tonal contrast, rough paper tooth and expressive gestural marks.',
                keywords: ['charcoal', 'tones', 'expressive', 'paper']
        },
        {
                id: 'gouache',
                name: 'Gouache',
                categoryId: 'traditional',
                summary: 'Matte opaque painted colour.',
                promptTemplate:
                        'Render as a gouache painting: matte opaque colour, flat confident shapes, crisp edges, subtle brushwork and a graphic poster-like clarity.',
                keywords: ['gouache', 'matte', 'opaque', 'graphic']
        },

        // --- Genre & worlds ---
        {
                id: 'high-fantasy',
                name: 'High Fantasy',
                categoryId: 'genre',
                summary: 'Grand mythic worlds and heroic imagery.',
                promptTemplate:
                        'Render as high fantasy artwork: mythic scale, ornate detail, dramatic natural light, rich jewel tones and a sense of ancient wonder.',
                preferredAspectRatios: ['16:9', '2:3'],
                keywords: ['fantasy', 'mythic', 'epic', 'world']
        },
        {
                id: 'dark-fantasy',
                name: 'Dark Fantasy',
                categoryId: 'genre',
                summary: 'Grim, ominous fantasy atmosphere.',
                promptTemplate:
                        'Render as dark fantasy artwork: grim atmosphere, deep shadow, muted desaturated palette with cold highlights, weathered detail and an ominous mood.',
                preferredAspectRatios: ['16:9', '2:3'],
                keywords: ['dark', 'gothic', 'grim', 'fantasy']
        },
        {
                id: 'science-fiction',
                name: 'Science Fiction',
                categoryId: 'genre',
                summary: 'Futuristic technology and scale.',
                promptTemplate:
                        'Render as science fiction artwork: advanced technology, clean geometric forms, atmospheric haze, cool accent lighting and a believable futuristic scale.',
                preferredAspectRatios: ['16:9'],
                keywords: ['sci-fi', 'future', 'space', 'technology']
        },
        {
                id: 'cyberpunk',
                name: 'Cyberpunk',
                categoryId: 'genre',
                summary: 'Neon-lit high-tech, low-life cityscapes.',
                promptTemplate:
                        'Render in a cyberpunk style: dense neon lighting, wet reflective surfaces, layered signage, deep shadows and a saturated magenta-and-cyan palette.',
                preferredAspectRatios: ['16:9', '2:3'],
                keywords: ['cyberpunk', 'neon', 'city', 'night']
        },
        {
                id: 'surrealism',
                name: 'Surrealism',
                categoryId: 'genre',
                summary: 'Dreamlike impossible juxtapositions.',
                promptTemplate:
                        'Render as a surrealist artwork: dreamlike impossible juxtaposition, immaculate realistic rendering of illogical forms, soft even light and a quiet uncanny mood.',
                keywords: ['surreal', 'dream', 'impossible', 'strange']
        },
        {
                id: 'steampunk',
                name: 'Steampunk',
                categoryId: 'genre',
                summary: 'Victorian machinery and brass.',
                promptTemplate:
                        'Render in a steampunk style: intricate Victorian machinery, brass and copper fittings, exposed gears, warm gaslight and a weathered industrial finish.',
                keywords: ['steampunk', 'brass', 'victorian', 'gears']
        },
        {
                id: 'cosmic-horror',
                name: 'Cosmic Horror',
                categoryId: 'genre',
                summary: 'Vast, unsettling otherworldly dread.',
                promptTemplate:
                        'Render as cosmic horror: immense unknowable scale, unsettling organic geometry, cold light from no visible source, heavy atmosphere and a pervasive sense of dread.',
                preferredAspectRatios: ['2:3', '16:9'],
                keywords: ['horror', 'eldritch', 'cosmic', 'dread']
        },

        // --- Stylised & retro ---
        {
                id: 'anime',
                name: 'Anime',
                categoryId: 'stylised',
                summary: 'Japanese animation cel style.',
                promptTemplate:
                        'Render in an anime style: clean cel shading, crisp line art, expressive eyes, stylised colour and dynamic composition.',
                keywords: ['anime', 'manga', 'cel', 'japan']
        },
        {
                id: 'manga-ink',
                name: 'Manga Ink',
                categoryId: 'stylised',
                summary: 'High-contrast black-and-white manga.',
                promptTemplate:
                        'Render as a black-and-white manga panel: bold ink lines, screentone shading, dramatic contrast and expressive panel composition.',
                preferredAspectRatios: ['2:3', '1:1'],
                keywords: ['manga', 'ink', 'screentone', 'monochrome']
        },
        {
                id: 'pixel-art',
                name: 'Pixel Art',
                categoryId: 'stylised',
                summary: 'Limited-palette low-resolution sprites.',
                promptTemplate:
                        'Render as pixel art: a limited indexed palette, deliberate pixel clusters, clean readable silhouettes, dithering for shading and a strict pixel grid.',
                preferredAspectRatios: ['1:1', '9:16'],
                keywords: ['pixel', 'retro', 'sprite', '8-bit']
        },
        {
                id: 'comic-book',
                name: 'Comic Book',
                categoryId: 'stylised',
                summary: 'American comic inking with halftone.',
                promptTemplate:
                        'Render as comic book art: heavy ink outlines, dynamic anatomy, halftone shading, bold saturated colour and strong perspective.',
                keywords: ['comic', 'inking', 'halftone', 'superhero']
        },
        {
                id: 'graphic-novel',
                name: 'Graphic Novel',
                categoryId: 'stylised',
                summary: 'Restrained, atmospheric sequential art.',
                promptTemplate:
                        'Render as graphic novel art: restrained palette, textured inking, soft geometric shading, quiet atmosphere and cinematic panel staging.',
                keywords: ['graphic novel', 'noir', 'sequential', 'muted']
        },
        {
                id: 'retro-film',
                name: 'Retro Film',
                categoryId: 'stylised',
                summary: 'Faded analogue film with grain.',
                promptTemplate:
                        'Render as a retro analogue film photograph: visible grain, slight colour fading, mild halation around highlights, gentle vignette and a nostalgic warm cast.',
                keywords: ['retro', 'film', 'grain', 'vintage']
        },
        {
                id: 'vintage-poster',
                name: 'Vintage Poster',
                categoryId: 'stylised',
                summary: 'Mid-century printed poster design.',
                promptTemplate:
                        'Render as a mid-century vintage poster: flat limited palette, bold simplified shapes, slight print misregistration, paper texture and strong graphic hierarchy.',
                preferredAspectRatios: ['2:3', '4:5'],
                keywords: ['poster', 'vintage', 'mid-century', 'print']
        },
        {
                id: 'abstract',
                name: 'Abstract',
                categoryId: 'stylised',
                summary: 'Non-representational colour and form.',
                promptTemplate:
                        'Render as an abstract composition: non-representational colour fields, gestural marks, layered texture, tension between forms and no literal subject.',
                keywords: ['abstract', 'colour field', 'gesture', 'non-representational']
        },
        {
                id: 'minimalism',
                name: 'Minimalism',
                categoryId: 'stylised',
                summary: 'Reduced forms and generous space.',
                promptTemplate:
                        'Render in a minimalist style: a single clear subject, generous negative space, restrained palette, precise geometry and calm even lighting.',
                keywords: ['minimal', 'negative space', 'simple', 'clean']
        },

        // --- Brand & commercial ---
        {
                id: 'luxury-branding',
                name: 'Luxury Branding',
                categoryId: 'commercial',
                summary: 'Black-and-gold premium brand imagery.',
                promptTemplate:
                        'Render as luxury brand imagery: deep black surfaces, restrained metallic gold accents, immaculate materials, precise lighting and a composed, expensive feel.',
                preferredAspectRatios: ['1:1', '16:9'],
                keywords: ['luxury', 'brand', 'gold', 'premium']
        },
        {
                id: 'editorial-fashion',
                name: 'Editorial Fashion',
                categoryId: 'commercial',
                summary: 'High-fashion magazine imagery.',
                promptTemplate:
                        'Render as high-fashion editorial imagery: deliberate posing, striking styling, controlled dramatic lighting, refined colour grading and a strong sense of attitude.',
                preferredAspectRatios: ['4:5', '2:3'],
                keywords: ['fashion', 'editorial', 'magazine', 'model']
        },
        {
                id: 'food-photography',
                name: 'Food Photography',
                categoryId: 'commercial',
                summary: 'Appetising styled food imagery.',
                promptTemplate:
                        'Render as professional food photography: styled arrangement, directional side light, fresh natural colour, shallow depth of field and appetising texture detail.',
                preferredAspectRatios: ['1:1', '4:5'],
                keywords: ['food', 'culinary', 'styling', 'restaurant']
        },

        // --- Architecture & spaces ---
        {
                id: 'architectural-visualisation',
                name: 'Architectural Visualisation',
                categoryId: 'interior',
                summary: 'Precise exterior architecture rendering.',
                promptTemplate:
                        'Render as architectural visualisation: accurate perspective, realistic materials, balanced daylight, clean composition and a sense of real built scale.',
                preferredAspectRatios: ['16:9', '3:2'],
                keywords: ['architecture', 'building', 'exterior', 'archviz']
        },
        {
                id: 'interior-design',
                name: 'Interior Design',
                categoryId: 'interior',
                summary: 'Warm, styled interior spaces.',
                promptTemplate:
                        'Render as an interior design photograph: styled furnishing, layered practical and natural light, tactile materials, balanced composition and a warm inviting mood.',
                preferredAspectRatios: ['3:2', '4:5'],
                keywords: ['interior', 'room', 'furniture', 'home']
        },
        {
                id: 'isometric-room',
                name: 'Isometric Scene',
                categoryId: 'interior',
                summary: 'Tidy isometric miniature diorama.',
                promptTemplate:
                        'Render as an isometric diorama: a clean cutaway miniature scene, consistent isometric projection, soft even lighting, tidy detail and a charming model-like finish.',
                preferredAspectRatios: ['1:1'],
                keywords: ['isometric', 'diorama', 'miniature', 'game art']
        },

        // --- Nature & landscape ---
        {
                id: 'landscape-photography',
                name: 'Landscape Photography',
                categoryId: 'nature',
                summary: 'Sweeping natural vistas.',
                promptTemplate:
                        'Render as a landscape photograph: a sweeping natural vista, layered atmospheric depth, natural light, rich but accurate colour and careful foreground-to-background focus.',
                preferredAspectRatios: ['16:9', '3:2'],
                keywords: ['landscape', 'mountains', 'nature', 'vista']
        },
        {
                id: 'aerial-drone',
                name: 'Aerial View',
                categoryId: 'nature',
                summary: 'High-oblique drone perspective.',
                promptTemplate:
                        'Render as an aerial drone photograph: a high vantage point, graphic patterns in the terrain, even daylight, crisp detail and a strong sense of scale.',
                preferredAspectRatios: ['16:9', '1:1'],
                keywords: ['aerial', 'drone', 'top-down', 'landscape']
        },
        {
                id: 'underwater',
                name: 'Underwater',
                categoryId: 'nature',
                summary: 'Submerged light and marine life.',
                promptTemplate:
                        'Render as an underwater photograph: filtered blue-green light, suspended particles, caustic highlights, soft depth falloff and a serene submerged atmosphere.',
                keywords: ['underwater', 'ocean', 'marine', 'diving']
        },
        {
                id: 'botanical-illustration',
                name: 'Botanical Illustration',
                categoryId: 'nature',
                summary: 'Scientific plant studies.',
                promptTemplate:
                        'Render as a botanical illustration: scientifically accurate plant forms, fine watercolour detail, precise labelling space and a clean light background.',
                preferredAspectRatios: ['2:3', '4:5'],
                keywords: ['botanical', 'plants', 'scientific', 'flowers']
        },

        // --- Graphic & typography ---
        {
                id: 'typography-poster',
                name: 'Typography Poster',
                categoryId: 'graphic',
                summary: 'Type-led poster with strong hierarchy.',
                promptTemplate:
                        'Design a type-led poster: a dominant typographic composition, clear hierarchy, deliberate grid, restrained palette and confident negative space. If the subject does not specify text, keep lettering minimal or abstract.',
                preferredAspectRatios: ['2:3', '4:5'],
                hints: ['Lettering is only rendered when the subject defines it.'],
                keywords: ['typography', 'poster', 'type', 'layout']
        },
        {
                id: 'logo-emblem',
                name: 'Logo & Emblem',
                categoryId: 'graphic',
                summary: 'Simple, scalable mark concepts.',
                promptTemplate:
                        'Design a logo or emblem concept: a simple memorable mark, strong silhouette, balanced negative space, minimal flat colour and scalability down to small sizes, on a plain background.',
                preferredAspectRatios: ['1:1'],
                hints: ['Concepts are not trademarks; check originality before commercial use.'],
                keywords: ['logo', 'emblem', 'mark', 'brand mark']
        },
        {
                id: 'geometric-pattern',
                name: 'Geometric Pattern',
                categoryId: 'graphic',
                summary: 'Repeating tileable geometric design.',
                promptTemplate:
                        'Design a repeating geometric pattern: a tileable composition, consistent spacing, restrained palette and clean mathematical symmetry.',
                preferredAspectRatios: ['1:1'],
                keywords: ['pattern', 'tile', 'seamless', 'geometry']
        },

        // --- Educational ---
        {
                id: 'educational-diagram',
                name: 'Educational Diagram',
                categoryId: 'educational',
                summary: 'Clear explanatory visual for teaching.',
                promptTemplate:
                        'Render an educational diagram: a clear explanatory layout, labelled parts, restrained palette, uncluttered composition and legible purposeful detail.',
                hints: ['Labels should be reviewed for accuracy before publication.'],
                keywords: ['diagram', 'education', 'labels', 'teaching']
        },
        {
                id: 'infographic',
                name: 'Infographic',
                categoryId: 'educational',
                summary: 'Structured information visual.',
                promptTemplate:
                        'Render an infographic panel: a structured information layout, clear visual hierarchy, simple iconography, restrained palette and generous spacing.',
                preferredAspectRatios: ['2:3', '9:16'],
                hints: ['Numbers and figures must come from the subject, not the model.'],
                keywords: ['infographic', 'data', 'information', 'layout']
        }
];
