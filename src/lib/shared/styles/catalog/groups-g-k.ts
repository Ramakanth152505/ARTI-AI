/**
 * Catalogue groups G–K: design and graphics, historical and cultural
 * influences, fantasy and science fiction, social and creator formats, advanced
 * and experimental visuals.
 *
 * The same honesty rule applies: every entry is authored as a `prompt-only`
 * preset because no model is connected. Cultural references are stated as
 * techniques and traditions, never as claims about a people, and several entries
 * note that a region or tradition should be specified by the user.
 */

import { group, type StyleInput } from './style';

export const GROUP_DESIGN_GRAPHICS = group([
        {
                id: 'minimalist-design',
                name: 'Minimalist Design',
                categoryId: 'design-graphics',
                summary: 'Reduction to essential elements.',
                promptTemplate:
                        'Design in a minimalist style: only the essential elements, generous whitespace, restrained palette, precise alignment and calm, deliberate simplicity.',
                keywords: ['minimal', 'whitespace', 'simple', 'clean']
        },
        {
                id: 'luxury-design',
                name: 'Luxury Design',
                categoryId: 'design-graphics',
                summary: 'Premium materials and restrained richness.',
                promptTemplate:
                        'Design in a luxury style: deep dark surfaces, restrained metallic accents, immaculate materials, precise lighting and a composed, expensive feel.',
                keywords: ['luxury', 'premium', 'gold', 'refined']
        },
        {
                id: 'editorial-design',
                name: 'Editorial Design',
                categoryId: 'design-graphics',
                summary: 'Magazine layout and typographic hierarchy.',
                promptTemplate:
                        'Design an editorial layout: a strong typographic hierarchy, disciplined grid, considered photography placement and confident use of white space.',
                preferredAspectRatios: ['4:5', '2:3'],
                keywords: ['editorial', 'layout', 'grid', 'typography']
        },
        {
                id: 'swiss-design',
                name: 'Swiss-Inspired Design',
                categoryId: 'design-graphics',
                summary: 'Grid systems and objective typography.',
                promptTemplate:
                        'Design in a Swiss style: a strict modular grid, objective sans-serif typography, asymmetric balance, generous white space and no ornament.',
                keywords: ['swiss', 'grid', 'international style', 'objective']
        },
        {
                id: 'bauhaus-design',
                name: 'Bauhaus-Inspired Design',
                categoryId: 'design-graphics',
                summary: 'Primary geometry and functional form.',
                promptTemplate:
                        'Design in a Bauhaus style: primary geometric forms, functional composition, limited primary palette and the honest marriage of craft and industry.',
                keywords: ['bauhaus', 'geometry', 'primary', 'functional']
        },
        {
                id: 'geometric-design',
                name: 'Geometric Design',
                categoryId: 'design-graphics',
                summary: 'Ordered shape-based composition.',
                promptTemplate:
                        'Design with geometry: ordered regular shapes, consistent spacing, mathematical relationships and a clean constructed composition.',
                keywords: ['geometric', 'ordered', 'mathematical', 'shapes']
        },
        {
                id: 'isometric-illustration',
                name: 'Isometric Illustration',
                categoryId: 'design-graphics',
                summary: 'Consistent isometric projection.',
                promptTemplate:
                        'Render an isometric illustration: a consistent isometric projection, tidy modular detail, soft even lighting and a charming model-like finish.',
                keywords: ['isometric', 'projection', 'modular', 'diorama']
        },
        {
                id: 'infographic-animation',
                name: 'Infographic Animation',
                categoryId: 'design-graphics',
                summary: 'Animated explanatory information design.',
                promptTemplate:
                        'Render an animated infographic: a structured information layout that reveals progressively, clear hierarchy, simple iconography and restrained palette.',
                videoTemplate:
                        'Animate an infographic: information reveals progressively with clear choreography, simple icons and legible pacing.',
                mediaTypes: ['video'],
                hints: ['Numbers and figures must come from the subject, not the model.'],
                keywords: ['infographic', 'data', 'animated', 'explainer']
        },
        {
                id: 'kinetic-typography',
                name: 'Kinetic Typography',
                categoryId: 'design-graphics',
                summary: 'Type as the moving subject.',
                promptTemplate:
                        'Render kinetic typography: type itself is the moving subject, rhythmic timing, expressive motion and a clear typographic hierarchy.',
                videoTemplate:
                        'Animate kinetic typography: type moves rhythmically on the beat, with deliberate easing and expressive scale changes.',
                mediaTypes: ['video'],
                keywords: ['kinetic type', 'typography', 'motion', 'rhythm']
        },
        {
                id: '3d-typography',
                name: '3D Typography',
                categoryId: 'design-graphics',
                summary: 'Type modelled and lit in three dimensions.',
                promptTemplate:
                        'Render 3D typography: letterforms modelled in three dimensions, physically based materials, deliberate depth of field and controlled studio light.',
                keywords: ['3d type', 'typography', 'modelled', 'render']
        },
        {
                id: 'liquid-metal',
                name: 'Liquid-Metal Visuals',
                categoryId: 'design-graphics',
                summary: 'Chrome surfaces flowing like mercury.',
                promptTemplate:
                        'Render liquid-metal visuals: flowing chrome surfaces, mirror reflections of the environment, smooth tension between liquid and solid and cold high-contrast light.',
                videoTemplate:
                        'Animate liquid metal: chrome surfaces flow and reform smoothly, carrying live environment reflections.',
                keywords: ['liquid metal', 'chrome', 'mercury', 'reflective']
        },
        {
                id: 'holographic',
                name: 'Holographic Visuals',
                categoryId: 'design-graphics',
                summary: 'Iridescent spectral surfaces.',
                promptTemplate:
                        'Render holographic visuals: iridescent spectral gradients, shifting metallic sheen, thin-film interference and light-reactive surfaces.',
                videoTemplate:
                        'Animate holographic visuals: iridescent sheen shifts across the surface as light or viewpoint changes.',
                keywords: ['holographic', 'iridescent', 'spectral', 'sheen']
        },
        {
                id: 'glassmorphism',
                name: 'Glassmorphism-Inspired',
                categoryId: 'design-graphics',
                summary: 'Frosted glass layers and blur.',
                promptTemplate:
                        'Render glassmorphism-inspired visuals: frosted translucent layers, soft background blur, delicate edge highlights and depth created by stacked panes.',
                keywords: ['glass', 'frosted', 'blur', 'translucent']
        },
        {
                id: 'metallic-product',
                name: 'Metallic Product Visuals',
                categoryId: 'design-graphics',
                summary: 'Brushed and polished metal surfaces.',
                promptTemplate:
                        'Render metallic product visuals: brushed and polished metal surfaces, controlled anisotropic reflections, precise bevels and clean studio lighting.',
                preferredAspectRatios: ['1:1', '4:5'],
                keywords: ['metal', 'product', 'chrome', 'brushed']
        },
        {
                id: 'architectural-visualisation-shared',
                name: 'Architectural Visualisation',
                categoryId: 'design-graphics',
                summary: 'Precise built-environment rendering.',
                promptTemplate:
                        'Render architectural visualisation: accurate perspective, realistic materials, balanced daylight, clean composition and a sense of real built scale.',
                videoAspectRatios: ['16:9', '3:2'],
                keywords: ['archviz', 'architecture', 'perspective', 'realistic']
        },
        {
                id: 'technical-visualisation',
                name: 'Technical Visualisation',
                categoryId: 'design-graphics',
                summary: 'Exploded views and cutaway clarity.',
                promptTemplate:
                        'Render a technical visualisation: an exploded or cutaway view with precise linework, accurate proportions, restrained palette and clear functional detail.',
                hints: ['Labels should be reviewed for accuracy before publication.'],
                keywords: ['technical', 'cutaway', 'exploded view', 'engineering']
        }
] as StyleInput[]);

export const GROUP_HISTORICAL_CULTURAL = group([
        {
                id: 'ancient-world',
                name: 'Ancient-World-Inspired',
                categoryId: 'historical-cultural',
                summary: 'Early civilisations and their material culture.',
                promptTemplate:
                        'Render ancient-world-inspired visuals: antique stone and metal materials, weathered surfaces, monumental architecture and warm dust-lit atmosphere.',
                hints: ['Specify the region or tradition so the reference stays respectful and specific.'],
                keywords: ['ancient', 'antiquity', 'stone', 'monument']
        },
        {
                id: 'classical-architecture',
                name: 'Classical Architecture',
                categoryId: 'historical-cultural',
                summary: 'Orders, columns and symmetry.',
                promptTemplate:
                        'Render classical architecture: ordered columns, harmonious proportion, carved stone detail, symmetry and clean daylight raking across surfaces.',
                keywords: ['classical', 'columns', 'orders', 'symmetry']
        },
        {
                id: 'medieval-fantasy',
                name: 'Medieval-Inspired Fantasy',
                categoryId: 'historical-cultural',
                summary: 'Castles, timber and torchlight.',
                promptTemplate:
                        'Render medieval-inspired fantasy: heavy timber and stone construction, hand-forged metal, torch and window light and a lived-in historic atmosphere.',
                keywords: ['medieval', 'castle', 'torchlight', 'timber']
        },
        {
                id: 'renaissance',
                name: 'Renaissance-Inspired',
                categoryId: 'historical-cultural',
                summary: 'Balanced composition and sfumato light.',
                promptTemplate:
                        'Render Renaissance-inspired visuals: balanced classical composition, sfumato light modelling, warm earth pigments and a measured, dignified staging.',
                keywords: ['renaissance', 'sfumato', 'composition', 'classical']
        },
        {
                id: 'baroque',
                name: 'Baroque-Inspired',
                categoryId: 'historical-cultural',
                summary: 'Dramatic movement and rich shadow.',
                promptTemplate:
                        'Render Baroque-inspired visuals: dramatic diagonal movement, rich deep shadow, warm glowing highlights, ornate detail and theatrical lighting.',
                keywords: ['baroque', 'dramatic', 'ornate', 'tenebrism']
        },
        {
                id: 'victorian',
                name: 'Victorian-Inspired',
                categoryId: 'historical-cultural',
                summary: 'Dense ornament and gaslight atmosphere.',
                promptTemplate:
                        'Render Victorian-inspired visuals: dense ornament, dark carved wood, layered textiles, gaslit warm light and a respectfully formal, heavy atmosphere.',
                keywords: ['victorian', 'ornate', 'gaslight', 'formal']
        },
        {
                id: 'retro-1920s',
                name: 'Retro 1920s',
                categoryId: 'historical-cultural',
                summary: 'Jazz-age geometry and glamour.',
                promptTemplate:
                        'Render a 1920s retro look: Art Deco geometry, geometric adornment, warm sepia-to-cream palette and polished jazz-age glamour.',
                keywords: ['1920s', 'jazz age', 'art deco', 'glamour']
        },
        {
                id: 'retro-1950s',
                name: 'Retro 1950s',
                categoryId: 'historical-cultural',
                summary: 'Optimistic mid-century colour.',
                promptTemplate:
                        'Render a 1950s retro look: optimistic pastel-and-teal palette, clean mid-century forms, warm even light and cheerful advertising clarity.',
                keywords: ['1950s', 'mid-century', 'pastel', 'advertising']
        },
        {
                id: 'retro-1970s',
                name: 'Retro 1970s',
                categoryId: 'historical-cultural',
                summary: 'Earthy tones and warm grain.',
                promptTemplate:
                        'Render a 1970s retro look: earthy brown, orange and ochre palette, soft warm grain, gentle letterbox tones and a lived-in period feel.',
                keywords: ['1970s', 'earthy', 'ochre', 'period']
        },
        {
                id: 'retro-1980s',
                name: 'Retro 1980s',
                categoryId: 'historical-cultural',
                summary: 'Neon grids and analogue video.',
                promptTemplate:
                        'Render a 1980s retro look: neon magenta-and-cyan palette, chrome and grid motifs, analogue video softness and bold synthetic surfaces.',
                keywords: ['1980s', 'neon', 'analogue', 'synth']
        },
        {
                id: 'retro-1990s',
                name: 'Retro 1990s',
                categoryId: 'historical-cultural',
                summary: 'Early digital and grunge texture.',
                promptTemplate:
                        'Render a 1990s retro look: early-digital colour, mild video compression texture, grunge overlays and the honest roughness of the era.',
                keywords: ['1990s', 'grunge', 'early digital', 'video']
        },
        {
                id: 'vintage-futurism',
                name: 'Vintage Futurism',
                categoryId: 'historical-cultural',
                summary: 'Retro-futuristic speculation.',
                promptTemplate:
                        'Render vintage futurism: retro-futuristic speculation, bulbous machines and domes, warm metallic surfaces and an optimistic imagined tomorrow.',
                keywords: ['vintage futurism', 'retro future', 'speculative', 'domes']
        },
        {
                id: 'folk-art',
                name: 'Folk-Art-Inspired',
                categoryId: 'historical-cultural',
                summary: 'Traditional craft motifs and colour.',
                promptTemplate:
                        'Render folk-art-inspired visuals: traditional craft motifs, flat decorative colour, handmade imperfection and warm communal character.',
                hints: ['Specify the region or tradition so the reference stays respectful and specific.'],
                keywords: ['folk', 'craft', 'motif', 'traditional']
        },
        {
                id: 'regional-tradition',
                name: 'Regional Visual Tradition',
                categoryId: 'historical-cultural',
                summary: 'User-specified cultural visual tradition.',
                promptTemplate:
                        'Render a visual in the specified regional tradition: use its authentic motifs, palette and materials, and keep the reference specific and respectful.',
                hints: ['Name the region or tradition in the prompt. Do not generalise across cultures.'],
                keywords: ['regional', 'cultural', 'tradition', 'authentic']
        }
] as StyleInput[]);

export const GROUP_FANTASY_SCIFI = group([
        {
                id: 'high-fantasy-genre',
                name: 'High Fantasy',
                categoryId: 'fantasy-scifi',
                summary: 'Grand mythic worlds and heroic imagery.',
                promptTemplate:
                        'Render high fantasy: mythic scale, ornate detail, dramatic natural light, rich jewel tones and a sense of ancient wonder.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['high fantasy', 'mythic', 'epic', 'wonder']
        },
        {
                id: 'dark-fantasy-genre',
                name: 'Dark Fantasy',
                categoryId: 'fantasy-scifi',
                summary: 'Grim, ominous fantasy atmosphere.',
                promptTemplate:
                        'Render dark fantasy: grim atmosphere, deep shadow, muted desaturated palette with cold highlights, weathered detail and an ominous mood.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['dark fantasy', 'grim', 'gothic', 'ominous']
        },
        {
                id: 'mythological-fantasy',
                name: 'Mythological Fantasy',
                categoryId: 'fantasy-scifi',
                summary: 'Gods, monsters and heroic legend.',
                promptTemplate:
                        'Render mythological fantasy: legendary scale, symbolic imagery, dramatic celestial light and a heroic, timeless quality.',
                keywords: ['mythology', 'legend', 'heroic', 'symbolic']
        },
        {
                id: 'magical-realism',
                name: 'Magical Realism',
                categoryId: 'fantasy-scifi',
                summary: 'The impossible treated as ordinary.',
                promptTemplate:
                        'Render magical realism: an ordinary, believable setting in which one impossible element is treated as completely normal, with calm natural light.',
                videoTemplate:
                        'Magical-realist motion: a single impossible element behaved with complete matter-of-fact calm.',
                keywords: ['magical realism', 'ordinary', 'impossible', 'calm']
        },
        {
                id: 'space-exploration',
                name: 'Space Exploration',
                categoryId: 'fantasy-scifi',
                summary: 'Hardware, vacuum and real astronomy.',
                promptTemplate:
                        'Render space exploration: believable spacecraft hardware, vacuum-lit surfaces, accurate starfields and a grounded sense of real engineering.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['space', 'spacecraft', 'engineering', 'stars']
        },
        {
                id: 'alien-worlds',
                name: 'Alien Worlds',
                categoryId: 'fantasy-scifi',
                summary: 'Plausible exoplanet environments.',
                promptTemplate:
                        'Render an alien world: a plausible exoplanet environment, unfamiliar but coherent biology, an unusual atmospheric colour cast and a strange skyscape.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['alien', 'exoplanet', 'environment', 'xenobiology']
        },
        {
                id: 'futuristic-cities',
                name: 'Futuristic Cities',
                categoryId: 'fantasy-scifi',
                summary: 'Advanced urban skylines.',
                promptTemplate:
                        'Render a futuristic city: advanced architecture, layered elevated transport, atmospheric haze at depth, cool accent lighting and believable urban scale.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['futuristic', 'city', 'skyline', 'urban']
        },
        {
                id: 'dystopian-scifi',
                name: 'Dystopian Science Fiction',
                categoryId: 'fantasy-scifi',
                summary: 'Oppressive future and harsh light.',
                promptTemplate:
                        'Render dystopian science fiction: oppressive brutalist architecture, harsh surveillance light, desaturated palette with warning accents and a heavy, uneasy atmosphere.',
                keywords: ['dystopian', 'oppressive', 'surveillance', 'brutalist']
        },
        {
                id: 'utopian-scifi',
                name: 'Utopian Science Fiction',
                categoryId: 'fantasy-scifi',
                summary: 'Clean, harmonious future.',
                promptTemplate:
                        'Render utopian science fiction: clean harmonious architecture, integrated nature, bright balanced daylight and a calm, optimistic future.',
                keywords: ['utopian', 'harmonious', 'optimistic', 'clean']
        },
        {
                id: 'mecha',
                name: 'Mecha-Inspired',
                categoryId: 'fantasy-scifi',
                summary: 'Piloted machine design and scale.',
                promptTemplate:
                        'Render mecha-inspired visuals: detailed piloted machine design, functional panel-line detail, weighty pose and dramatic scale cues.',
                keywords: ['mecha', 'robot', 'machine', 'piloted']
        },
        {
                id: 'biomechanical',
                name: 'Biomechanical Design',
                categoryId: 'fantasy-scifi',
                summary: 'Fused organic and mechanical form.',
                promptTemplate:
                        'Render biomechanical design: fused organic and mechanical forms, anatomically plausible joinery, wet reflective surfaces and unsettling symmetry.',
                keywords: ['biomechanical', 'organic', 'giger', 'fusion']
        },
        {
                id: 'cosmic-surrealism',
                name: 'Cosmic Surrealism',
                categoryId: 'fantasy-scifi',
                summary: 'Vast unknowable cosmic scale.',
                promptTemplate:
                        'Render cosmic surrealism: an overwhelming sense of cosmic scale, unknowable forms, vast emptiness punctuated by light and a sublime, unsettling awe.',
                keywords: ['cosmic', 'surreal', 'scale', 'awe']
        },
        {
                id: 'cybernetic-environments',
                name: 'Cybernetic Environments',
                categoryId: 'fantasy-scifi',
                summary: 'Interiors woven with technology.',
                promptTemplate:
                        'Render a cybernetic environment: interiors woven with visible technology, cable and conduit detail, cool emissive light and a clean high-tech order.',
                keywords: ['cybernetic', 'interior', 'tech', 'emissive']
        },
        {
                id: 'futuristic-architecture',
                name: 'Futuristic Architecture',
                categoryId: 'fantasy-scifi',
                summary: 'Advanced speculative building.',
                promptTemplate:
                        'Render futuristic architecture: advanced speculative structure, smooth engineered surfaces, dramatic structural scale and clean daylight modelling.',
                keywords: ['futuristic', 'architecture', 'speculative', 'structure']
        }
] as StyleInput[]);

export const GROUP_SOCIAL_CREATOR = group([
        {
                id: 'short-form-vertical',
                name: 'Short-Form Vertical Video',
                categoryId: 'social-creator',
                summary: 'Punchy vertical framing for feeds.',
                promptTemplate:
                        'Render a short-form vertical video: strong central subject, immediate visual hook, bold colour, clear on-screen negative space for captions and energetic pacing.',
                videoTemplate:
                        'Short-form vertical motion: a strong hook in the first moment, snappy pacing, subject centred for vertical framing.',
                mediaTypes: ['video'],
                videoAspectRatios: ['9:16', '4:5'],
                keywords: ['vertical', 'short form', 'social', 'reels']
        },
        {
                id: 'social-storytelling',
                name: 'Social-Media Storytelling',
                categoryId: 'social-creator',
                summary: 'Narrative format tuned for feeds.',
                promptTemplate:
                        'Render social-media storytelling: a clear narrative beat per moment, strong subject focus, saturated friendly colour and caption-friendly composition.',
                videoTemplate:
                        'Social storytelling motion: one clear narrative beat per shot, friendlier pacing and caption-friendly framing.',
                mediaTypes: ['video'],
                keywords: ['social', 'storytelling', 'narrative', 'feed']
        },
        {
                id: 'creator-presentation',
                name: 'Creator-Style Presentation',
                categoryId: 'social-creator',
                summary: 'Direct-to-camera creator format.',
                promptTemplate:
                        'Render creator-style presentation: direct-to-camera framing, clean soft lighting, uncluttered background and confident, personable staging.',
                videoTemplate:
                        'Creator-style motion: direct address to camera, steady framing and confident personable pacing.',
                mediaTypes: ['video'],
                keywords: ['creator', 'presenter', 'direct to camera', 'vlog']
        },
        {
                id: 'educational-explainer',
                name: 'Educational Explainer',
                categoryId: 'social-creator',
                summary: 'Clear instructional presentation.',
                promptTemplate:
                        'Render an educational explainer: a clear instructional layout, uncluttered staging, restrained palette and legible, purposeful detail.',
                videoTemplate:
                        'Explainer motion: calm deliberate pacing, clear instructional staging and legible on-screen structure.',
                videoAspectRatios: ['16:9', '9:16'],
                hints: ['Claims and figures must come from the source material, not the model.'],
                keywords: ['explainer', 'education', 'instruction', 'clear']
        },
        {
                id: 'product-advertisement',
                name: 'Product Advertisement',
                categoryId: 'social-creator',
                summary: 'Commercial spot with premium finish.',
                promptTemplate:
                        'Render a product advertisement frame: immaculate product lighting, controlled reflections, a clean hero composition and premium commercial finish.',
                videoTemplate:
                        'Product-ad motion: smooth hero moves around the product, precise reflective light and confident commercial pacing.',
                mediaTypes: ['video'],
                keywords: ['advertisement', 'product', 'commercial', 'hero']
        },
        {
                id: 'cinematic-trailer',
                name: 'Cinematic Trailer',
                categoryId: 'social-creator',
                summary: 'Escalating trailer cut and drama.',
                promptTemplate:
                        'Render a cinematic trailer frame: escalating drama, bold composited scale, high-contrast grading and a sense of imminent spectacle.',
                videoTemplate:
                        'Trailer motion: escalating rhythm, bold sweeping camera moves and hard dramatic cuts.',
                mediaTypes: ['video'],
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['trailer', 'teaser', 'drama', 'epic']
        },
        {
                id: 'music-video',
                name: 'Music Video',
                categoryId: 'social-creator',
                summary: 'Rhythm-led stylised performance.',
                promptTemplate:
                        'Render a music-video frame: stylised performance staging, bold lighting colour, rhythm-led composition and confident visual attitude.',
                videoTemplate:
                        'Music-video motion: performance and camera move on the beat, bold colour lighting and rhythmic cuts.',
                mediaTypes: ['video'],
                keywords: ['music video', 'performance', 'rhythm', 'stylised']
        },
        {
                id: 'lyric-video',
                name: 'Lyric Video',
                categoryId: 'social-creator',
                summary: 'Type-led musical presentation.',
                promptTemplate:
                        'Render a lyric-video frame: a typographic composition carrying the words, restrained background treatment and clear rhythmic hierarchy.',
                videoTemplate:
                        'Lyric-video motion: type animating on the beat over a restrained moving background.',
                mediaTypes: ['video'],
                videoAspectRatios: ['16:9', '9:16'],
                keywords: ['lyric', 'typography', 'music', 'words']
        },
        {
                id: 'documentary-explainer',
                name: 'Documentary Explainer',
                categoryId: 'social-creator',
                summary: 'Journalistic explanation with evidence.',
                promptTemplate:
                        'Render a documentary explainer frame: observational realism, an honest visual emphasis on evidence, natural colour and a considered journalistic framing.',
                videoTemplate:
                        'Documentary-explainer motion: observational camera, natural pacing and honest visual emphasis on evidence.',
                mediaTypes: ['video'],
                keywords: ['documentary', 'journalism', 'evidence', 'explain']
        },
        {
                id: 'travel-film',
                name: 'Travel Film',
                categoryId: 'social-creator',
                summary: 'Sense of place and discovery.',
                promptTemplate:
                        'Render a travel-film frame: a strong sense of place, natural rich colour, sweeping vista or intimate detail and a feeling of discovery.',
                videoTemplate:
                        'Travel-film motion: sweeping establishing moves mixed with intimate detail and a sense of place.',
                mediaTypes: ['video'],
                keywords: ['travel', 'place', 'vista', 'discovery']
        },
        {
                id: 'food-video',
                name: 'Food Video',
                categoryId: 'social-creator',
                summary: 'Appetising culinary close detail.',
                promptTemplate:
                        'Render a food-video frame: styled arrangement, directional side light, fresh natural colour and appetising texture detail.',
                videoTemplate:
                        'Food-video motion: delicate close moves on texture, rising steam and slow appetising action.',
                mediaTypes: ['video'],
                preferredAspectRatios: ['1:1', '4:5'],
                keywords: ['food', 'culinary', 'appetising', 'styling']
        },
        {
                id: 'fitness-video',
                name: 'Fitness Video',
                categoryId: 'social-creator',
                summary: 'Energy and physical effort.',
                promptTemplate:
                        'Render a fitness-video frame: strong physical posture, high-contrast gym lighting, dynamic composition and visible energy and effort.',
                videoTemplate:
                        'Fitness motion: dynamic effort captured with rhythmic cuts and high-contrast gym light.',
                mediaTypes: ['video'],
                keywords: ['fitness', 'gym', 'energy', 'workout']
        },
        {
                id: 'fashion-film',
                name: 'Fashion Film',
                categoryId: 'social-creator',
                summary: 'Stylised garment and movement.',
                promptTemplate:
                        'Render a fashion-film frame: striking styling, dramatic controlled light, confident movement and a refined editorial attitude.',
                videoTemplate:
                        'Fashion-film motion: confident stylised movement, dramatic light and refined slow-motion detail.',
                mediaTypes: ['video'],
                keywords: ['fashion film', 'styling', 'movement', 'editorial']
        },
        {
                id: 'gaming-cinematic',
                name: 'Gaming Cinematic',
                categoryId: 'social-creator',
                summary: 'Real-time-render cinematic staging.',
                promptTemplate:
                        'Render a game cinematic frame: real-time-render styling, dynamic hero staging, dramatic environmental light and confident blockbuster composition.',
                videoTemplate:
                        'Game-cinematic motion: real-time-render hero staging with dramatic environmental light and confident camera work.',
                mediaTypes: ['video'],
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['gaming', 'cinematic', 'real time', 'blockbuster']
        },
        {
                id: 'brand-film',
                name: 'Brand Film',
                categoryId: 'social-creator',
                summary: 'Values-led premium brand story.',
                promptTemplate:
                        'Render a brand-film frame: restrained premium composition, meaningful human detail, immaculate light and a calm confident brand voice.',
                videoTemplate:
                        'Brand-film motion: calm considered camera movement over meaningful detail and premium lighting.',
                mediaTypes: ['video'],
                keywords: ['brand', 'film', 'premium', 'values']
        },
        {
                id: 'event-recap',
                name: 'Event Recap',
                categoryId: 'social-creator',
                summary: 'Highlights of a live event.',
                promptTemplate:
                        'Render an event-recap frame: energetic crowd or stage detail, mixed pragmatic lighting, authentic candid moments and a sense of occasion.',
                videoTemplate:
                        'Event-recap motion: energetic highlights, mixed available light and authentic candid pacing.',
                mediaTypes: ['video'],
                keywords: ['event', 'recap', 'highlights', 'live']
        },
        {
                id: 'tutorial-video',
                name: 'Tutorial Video',
                categoryId: 'social-creator',
                summary: 'Step-by-step instructional framing.',
                promptTemplate:
                        'Render a tutorial-video frame: a clean instructional setup, close focus on the hands or subject, even light and uncluttered background.',
                videoTemplate:
                        'Tutorial motion: deliberate step-by-step pacing with close instructional focus and even light.',
                mediaTypes: ['video'],
                videoAspectRatios: ['16:9', '9:16'],
                keywords: ['tutorial', 'how to', 'instruction', 'steps']
        }
] as StyleInput[]);

export const GROUP_EXPERIMENTAL = group([
        {
                id: 'photogrammetry',
                name: 'Photogrammetry-Inspired',
                categoryId: 'advanced-experimental',
                summary: 'Scanned point-cloud surface character.',
                promptTemplate:
                        'Render photogrammetry-inspired visuals: scanned surface character, subtle reconstruction noise, uniform diffuse light and a slightly uncanny real-capture quality.',
                videoTemplate:
                        'Photogrammetry motion: captured-surface character that holds together as the viewpoint moves.',
                execution: 'model-dependent',
                keywords: ['photogrammetry', 'scan', 'point cloud', 'capture']
        },
        {
                id: 'volumetric-light',
                name: 'Volumetric-Light Aesthetics',
                categoryId: 'advanced-experimental',
                summary: 'Visible light in atmospheric volume.',
                promptTemplate:
                        'Render volumetric-light aesthetics: visible god rays through atmosphere, dust or haze, strong beam definition and deep atmospheric depth.',
                videoTemplate:
                        'Volumetric motion: light beams shifting subtly as the camera or atmosphere moves.',
                keywords: ['volumetric', 'god rays', 'atmosphere', 'beams']
        },
        {
                id: 'particle-visuals',
                name: 'Particle-Based Visuals',
                categoryId: 'advanced-experimental',
                summary: 'Form built from countless particles.',
                promptTemplate:
                        'Render particle-based visuals: a form built from countless particles, fine grain detail, coherent emergent structure and luminous density.',
                videoTemplate:
                        'Particle motion: particles flowing, coalescing and dispersing in continuous coherent motion.',
                mediaTypes: ['video'],
                keywords: ['particles', 'emergent', 'density', 'simulation']
        },
        {
                id: 'fluid-simulation',
                name: 'Fluid Simulation',
                categoryId: 'advanced-experimental',
                summary: 'Physically believable fluid motion.',
                promptTemplate:
                        'Render fluid simulation: physically believable liquid behaviour, surface tension detail, caustics and accurate refraction.',
                videoTemplate:
                        'Fluid motion: continuous plausible fluid behaviour with surface tension, splash and accurate refraction.',
                mediaTypes: ['video'],
                execution: 'model-dependent',
                keywords: ['fluid', 'simulation', 'liquid', 'caustics']
        },
        {
                id: 'procedural-environments',
                name: 'Procedural Environments',
                categoryId: 'advanced-experimental',
                summary: 'Algorithmically generated worlds.',
                promptTemplate:
                        'Render procedural environments: algorithmically generated terrain and structure, self-similar detail at every scale and a coherent invented logic.',
                videoTemplate:
                        'Procedural motion: generated terrain or structure revealed in a continuous consistent sweep.',
                keywords: ['procedural', 'generated', 'terrain', 'algorithmic']
        },
        {
                id: 'generative-abstract',
                name: 'Generative Abstract Visuals',
                categoryId: 'advanced-experimental',
                summary: 'Emergent abstract digital form.',
                promptTemplate:
                        'Render generative abstract visuals: emergent digital form, fine computational texture, organic structure from simple rules and saturated engineered colour.',
                videoTemplate:
                        'Generative motion: abstract forms evolving continuously under a visible but abstract ruleset.',
                mediaTypes: ['video'],
                keywords: ['generative', 'abstract', 'emergent', 'algorithmic']
        },
        {
                id: 'dreamlike',
                name: 'Dreamlike Visuals',
                categoryId: 'advanced-experimental',
                summary: 'Soft, hazy, illogical atmosphere.',
                promptTemplate:
                        'Render dreamlike visuals: soft hazy focus, glowing diffuse light, drifting illogical space and a calm, slightly melancholy atmosphere.',
                videoTemplate:
                        'Dreamlike motion: slow drifting camera, soft focus holds and gently illogical spatial shifts.',
                keywords: ['dreamlike', 'hazy', 'soft', 'ethereal']
        },
        {
                id: 'glitch-art',
                name: 'Glitch Art',
                categoryId: 'advanced-experimental',
                summary: 'Digital error as aesthetic.',
                promptTemplate:
                        'Render glitch art: deliberate digital corruption, databending artefacts, chroma tearing, scanline rupture and an aggressive electronic palette.',
                videoTemplate:
                        'Glitch motion: intermittent digital tearing and chroma rupture cutting through otherwise stable imagery.',
                mediaTypes: ['video'],
                keywords: ['glitch', 'error', 'databend', 'corruption']
        },
        {
                id: 'datamosh',
                name: 'Datamosh-Inspired',
                categoryId: 'advanced-experimental',
                summary: 'Compression motion bleeding between shots.',
                promptTemplate:
                        'Render datamosh-inspired visuals: compression motion bleeding between images, smeared motion vectors, blocky artefact trails and a hallucinatory continuity.',
                videoTemplate:
                        'Datamosh motion: motion from one image smears into the next, carrying blocky artefact trails.',
                mediaTypes: ['video'],
                videoAspectRatios: ['16:9', '9:16'],
                keywords: ['datamosh', 'compression', 'artefact', 'motion vectors']
        },
        {
                id: 'psychedelic',
                name: 'Psychedelic Visuals',
                categoryId: 'advanced-experimental',
                summary: 'Saturated swirling perceptual distortion.',
                promptTemplate:
                        'Render psychedelic visuals: saturated swirling colour, fractal perceptual distortion, pulsing organic pattern and overwhelming kaleidoscopic detail.',
                videoTemplate:
                        'Psychedelic motion: continuously swirling fractal patterns pulsing and breathing in saturated colour.',
                mediaTypes: ['video'],
                keywords: ['psychedelic', 'kaleidoscope', 'fractal', 'swirl']
        },
        {
                id: 'experimental-compositing',
                name: 'Experimental Compositing',
                categoryId: 'advanced-experimental',
                summary: 'Layered mixed-technique compositing.',
                promptTemplate:
                        'Render experimental compositing: layered mixed-technique imagery, deliberate seams and overlays, unexpected scale relationships and a constructed, collage-like frame.',
                videoTemplate:
                        'Experimental compositing motion: layered techniques shifting independently with deliberate constructed seams.',
                mediaTypes: ['video'],
                keywords: ['compositing', 'collage', 'layered', 'mixed media']
        },
        {
                id: 'surreal-transitions',
                name: 'Surreal Transitions',
                categoryId: 'advanced-experimental',
                summary: 'Impossible transformations between shots.',
                promptTemplate:
                        'Render surreal-transition imagery: an impossible transformation between two states, seamless morphing logic and a quietly uncanny continuity.',
                videoTemplate:
                        'Surreal-transition motion: one form morphs seamlessly and impossibly into another without a cut.',
                mediaTypes: ['video'],
                keywords: ['transition', 'morph', 'impossible', 'seamless']
        },
        {
                id: 'mixed-media',
                name: 'Mixed-Media Visuals',
                categoryId: 'advanced-experimental',
                summary: 'Several media combined in one frame.',
                promptTemplate:
                        'Render mixed-media visuals: several media combined in one frame — drawing over photograph, paint over collage — held together by deliberate art direction.',
                videoTemplate:
                        'Mixed-media motion: different media layers animate at their own natural speeds within one frame.',
                keywords: ['mixed media', 'combined', 'collage', 'layered']
        }
] as StyleInput[]);
