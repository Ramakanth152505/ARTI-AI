/**
 * Catalogue groups A–F: realism and cinematic, digital art, animation,
 * anime and comic, painting and traditional media, photography.
 *
 * Every entry ships `execution: 'prompt-only'` (the constructor default), because
 * no generation model is connected and none of these has been verified end to
 * end. `videoTemplate` is the guidance used when the style is applied to a video
 * prompt; when it is absent the video builder falls back to `promptTemplate`.
 */

import { group, type StyleInput } from './style';

export const GROUP_REALISM_CINEMATIC = group([
        {
                id: 'photorealistic',
                name: 'Photorealistic',
                categoryId: 'realism-cinematic',
                summary: 'Believable photographic realism with natural detail.',
                promptTemplate:
                        'Render photorealistically: physically plausible lighting, accurate materials, natural surface detail, true-to-life proportions and no stylisation.',
                videoTemplate:
                        'Photorealistic motion with physically plausible light, stable geometry between frames and natural, non-stylised movement.',
                negativeTemplate: 'cartoon, illustration, painting, cgi, plastic skin, deformed',
                videoAspectRatios: ['16:9', '9:16', '1:1'],
                keywords: ['realistic', 'photo', 'natural', 'true to life']
        },
        {
                id: 'hyperrealistic',
                name: 'Hyperrealistic',
                categoryId: 'realism-cinematic',
                summary: 'Enhanced realism with heightened micro-detail.',
                promptTemplate:
                        'Render hyperrealistically: every surface carries heightened micro-detail, extreme clarity, controlled specular highlights and a level of resolution that reads as larger than life.',
                videoTemplate:
                        'Hyperrealistic motion with extreme surface micro-detail, crisp specular response and no softening between frames.',
                keywords: ['hyperreal', 'detail', 'sharp', 'enhanced']
        },
        {
                id: 'cinematic-realism',
                name: 'Cinematic Realism',
                categoryId: 'realism-cinematic',
                summary: 'Realism filtered through a feature-film look.',
                promptTemplate:
                        'Render with cinematic realism: realistic subject matter, filmic colour grading, careful contrast curve, motivated lighting and a composed cinematic frame.',
                videoTemplate:
                        'Cinematic realism with filmic colour grading, motivated practical lighting, deliberate camera motion and a consistent grade across the whole shot.',
                videoAspectRatios: ['16:9', '2.39:1'],
                keywords: ['cinema', 'film', 'grade', 'realism']
        },
        {
                id: 'film-grain-cinema',
                name: 'Film-Grain Cinema',
                categoryId: 'realism-cinematic',
                summary: 'Analog texture with visible film grain.',
                promptTemplate:
                        'Render as film-grain cinema: visible organic grain, gentle halation around highlights, slight gate weave, warm highlight roll-off and an analog colour response.',
                videoTemplate:
                        'Film-grain motion with organic grain that moves frame to frame, subtle gate weave and natural highlight halation.',
                keywords: ['grain', 'analog', '35mm', 'texture']
        },
        {
                id: 'documentary',
                name: 'Documentary',
                categoryId: 'realism-cinematic',
                summary: 'Observational, un-staged realism.',
                promptTemplate:
                        'Render as documentary footage: observational framing, available light, honest un-staged detail, natural colour and a sense of a real moment being recorded.',
                videoTemplate:
                        'Documentary motion: handheld observational camera, available light, natural pacing and un-staged subject behaviour.',
                keywords: ['documentary', 'observational', 'handheld', 'real']
        },
        {
                id: 'naturalistic-lighting',
                name: 'Naturalistic Lighting',
                categoryId: 'realism-cinematic',
                summary: 'Light that behaves as it would in the real world.',
                promptTemplate:
                        'Render with naturalistic lighting: a single believable key source, accurate soft shadow falloff, realistic bounce and no unmotivated fill light.',
                videoTemplate:
                        'Naturalistic lighting held consistently through the motion, with believable shadow behaviour as the subject or camera moves.',
                keywords: ['lighting', 'natural', 'soft', 'bounce']
        },
        {
                id: 'studio-cinematography',
                name: 'Studio Cinematography',
                categoryId: 'realism-cinematic',
                summary: 'Controlled studio lighting and staging.',
                promptTemplate:
                        'Render as studio cinematography: a deliberate multi-light setup, controlled background separation, precise exposure and a composed, professional frame.',
                videoTemplate:
                        'Studio cinematography with a fixed controlled lighting setup, motivated camera moves and consistent exposure throughout.',
                keywords: ['studio', 'lighting setup', 'controlled', 'production']
        },
        {
                id: 'imax-composition',
                name: 'IMAX-Inspired Composition',
                categoryId: 'realism-cinematic',
                summary: 'Large-format scale and sweeping composition.',
                promptTemplate:
                        'Compose as large-format IMAX-inspired cinema: immense scale, deep clean focus front to back, sweeping composition and detail that rewards the widest frame.',
                videoTemplate:
                        'IMAX-inspired motion with sweeping slow camera moves, vast scale and deep focus held across the shot.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['imax', 'large format', 'scale', 'epic']
        },
        {
                id: 'vintage-film',
                name: 'Vintage Film',
                categoryId: 'realism-cinematic',
                summary: 'Aged stock look with faded colour.',
                promptTemplate:
                        'Render as vintage film stock: muted faded colour, soft contrast, visible emulsion texture, slight dust and a gentler, aged tonality.',
                videoTemplate:
                        'Vintage film motion with faded colour, soft contrast, occasional dust and flicker, and a steady aged tonality.',
                keywords: ['vintage', 'film', 'faded', 'aged']
        },
        {
                id: 'noir-cinema',
                name: 'Noir Cinema',
                categoryId: 'realism-cinematic',
                summary: 'Classic noir chiaroscuro in monochrome.',
                promptTemplate:
                        'Render as classic noir cinema: monochrome tonality, extreme chiaroscuro, hard slatted shadows, deep blacks and a tense, stylised frame.',
                videoTemplate:
                        'Classic noir motion with hard directional shadow, monochrome tonality and slow deliberate camera movement.',
                keywords: ['noir', 'monochrome', 'shadow', 'classic']
        },
        {
                id: 'neo-noir-cinema',
                name: 'Neo-Noir',
                categoryId: 'realism-cinematic',
                summary: 'Moody modern noir with colour accents.',
                promptTemplate:
                        'Render in neo-noir style: low-key lighting, deep shadow, a restrained desaturated palette with one cold accent colour and strong silhouette.',
                videoTemplate:
                        'Neo-noir motion with low-key lighting, deep shadow and minimal, deliberate camera movement.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['neo-noir', 'moody', 'shadow', 'modern']
        },
        {
                id: 'retro-futurism',
                name: 'Retro-Futurism',
                categoryId: 'realism-cinematic',
                summary: 'Yesterday’s vision of tomorrow.',
                promptTemplate:
                        'Render as retro-futurism: optimistic vintage-future technology, chrome and curved plastics, warm analog accents and mid-century design language.',
                videoTemplate:
                        'Retro-futurist motion with warm analog light, mechanical camera movement and optimistic vintage-future styling.',
                keywords: ['retro future', 'atomic', 'mid-century', 'chrome']
        },
        {
                id: 'cyberpunk-cinema',
                name: 'Cyberpunk',
                categoryId: 'realism-cinematic',
                summary: 'Neon-lit, high-tech and low-life.',
                promptTemplate:
                        'Render in a cyberpunk style: dense neon signage, wet reflective surfaces, layered haze, deep shadows and a saturated magenta-and-cyan palette.',
                videoTemplate:
                        'Cyberpunk motion with drifting neon, rain-slick reflections, layered depth and moving signage light.',
                videoAspectRatios: ['16:9', '2.39:1'],
                keywords: ['cyberpunk', 'neon', 'night city', 'tech']
        },
        {
                id: 'solarpunk',
                name: 'Solarpunk',
                categoryId: 'realism-cinematic',
                summary: 'Optimistic green technology and daylight.',
                promptTemplate:
                        'Render in a solarpunk style: abundant greenery integrated with clean technology, bright natural daylight, warm optimism and crafted, humane detail.',
                videoTemplate:
                        'Solarpunk motion with bright daylight, gentle natural camera drift and lush integrated greenery.',
                keywords: ['solarpunk', 'green', 'optimistic', 'daylight']
        },
        {
                id: 'space-opera',
                name: 'Space Opera',
                categoryId: 'realism-cinematic',
                summary: 'Grand interstellar scale and drama.',
                promptTemplate:
                        'Render as space-opera spectacle: vast interstellar scale, luminous nebulae, grand vessels, dramatic rim light and a sense of operatic drama.',
                videoTemplate:
                        'Space-opera motion with slow majestic camera moves, drifting light across scale references and operatic pacing.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['space opera', 'galactic', 'grand', 'stars']
        },
        {
                id: 'epic-fantasy-cinema',
                name: 'Epic Fantasy',
                categoryId: 'realism-cinematic',
                summary: 'Mythic scale with grounded realism.',
                promptTemplate:
                        'Render as epic fantasy cinema: mythic landscapes, grounded production detail, dramatic god-ray light, rich earth-and-jewel palette and grand scale.',
                videoTemplate:
                        'Epic fantasy motion with sweeping camera movement, volumetric light and grounded, weighty subject motion.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['epic', 'fantasy', 'mythic', 'grand']
        },
        {
                id: 'historical-drama',
                name: 'Historical Drama',
                categoryId: 'realism-cinematic',
                summary: 'Period-accurate dramatic realism.',
                promptTemplate:
                        'Render as a historical drama: period-accurate costumes and props, soft window or candle light, restrained natural palette and dignified composed framing.',
                videoTemplate:
                        'Historical drama motion with restrained camera work, period-accurate practical light and dignified pacing.',
                keywords: ['historical', 'period drama', 'costume', 'accurate']
        },
        {
                id: 'period-film',
                name: 'Period Film',
                categoryId: 'realism-cinematic',
                summary: 'Era-specific film stock and colour.',
                promptTemplate:
                        'Render as a period film: era-appropriate colour response, soft contrast, authentic textures and the tonality of the matching film stock of that decade.',
                videoTemplate:
                        'Period-film motion with era-matched colour response, steady framing and authentic analogue texture.',
                keywords: ['period', 'era', 'stock', 'authentic']
        },
        {
                id: 'minimalist-cinema',
                name: 'Minimalist Cinema',
                categoryId: 'realism-cinematic',
                summary: 'Static frames, negative space and stillness.',
                promptTemplate:
                        'Render as minimalist cinema: a single subject, generous negative space, a locked-off or barely-moving frame, restrained palette and quiet, even light.',
                videoTemplate:
                        'Minimalist cinema with a locked frame, very slow or absent camera movement and patient, still pacing.',
                keywords: ['minimal', 'static', 'still', 'negative space']
        }
] as StyleInput[]);

export const GROUP_DIGITAL_ART = group([
        {
                id: 'digital-painting-shared',
                name: 'Digital Painting',
                categoryId: 'digital-art',
                summary: 'Painted digital artwork with visible brushwork.',
                promptTemplate:
                        'Render as a digital painting with confident visible brushwork, layered shading, rich local colour, deliberate edge control and a painted light source.',
                videoTemplate:
                        'Digital-painting motion with flowing brushwork that evolves between frames while shapes stay readable.',
                keywords: ['painting', 'digital', 'brushwork', 'art']
        },
        {
                id: 'concept-art-shared',
                name: 'Concept Art',
                categoryId: 'digital-art',
                summary: 'Production design artwork for worlds and props.',
                promptTemplate:
                        'Render as production concept art: a clear design read, strong silhouettes, functional detail, atmospheric background and consistent art direction.',
                videoTemplate:
                        'Concept-art motion with a slight parallax drift that reveals the design without losing the art-direction clarity.',
                keywords: ['concept', 'design', 'production', 'worldbuilding']
        },
        {
                id: 'matte-painting-shared',
                name: 'Matte Painting',
                categoryId: 'digital-art',
                summary: 'Painterly environment art with cinematic depth.',
                promptTemplate:
                        'Render as a matte painting: painterly environment detail, layered atmospheric depth, cinematic scale, integrated light and a coherent colour script.',
                videoTemplate:
                        'Matte-painting motion with slow layered parallax, drifting atmosphere and a stable colour script.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['matte', 'environment', 'vfx', 'depth']
        },
        {
                id: 'environment-concept-art',
                name: 'Environment Concept Art',
                categoryId: 'digital-art',
                summary: 'Designed worlds and locations.',
                promptTemplate:
                        'Render environment concept art: a fully designed location, clear spatial read, readable landmarks, atmospheric scale cues and deliberate art direction.',
                keywords: ['environment', 'location', 'level design', 'world']
        },
        {
                id: 'character-concept-art',
                name: 'Character Concept Art',
                categoryId: 'digital-art',
                summary: 'Designed characters with clear silhouettes.',
                promptTemplate:
                        'Render character concept art: a full design read on one character, strong silhouette, functional costuming, believable materials and consistent lighting.',
                keywords: ['character', 'design', 'costume', 'turnaround']
        },
        {
                id: 'stylized-digital-illustration',
                name: 'Stylised Digital Illustration',
                categoryId: 'digital-art',
                summary: 'Clean, appealing stylised digital art.',
                promptTemplate:
                        'Render a stylised digital illustration: appealing simplified forms, clean shapes, deliberate colour grouping, soft shading and a polished finish.',
                keywords: ['stylised', 'illustration', 'clean', 'polished']
        },
        {
                id: 'fantasy-illustration',
                name: 'Fantasy Illustration',
                categoryId: 'digital-art',
                summary: 'Romantic fantasy digital artwork.',
                promptTemplate:
                        'Render fantasy illustration: ornate detail, dramatic magical light, rich jewel tones, winding composition and a sense of wonder.',
                keywords: ['fantasy', 'magic', 'ornate', 'wonder']
        },
        {
                id: 'scifi-illustration',
                name: 'Science-Fiction Illustration',
                categoryId: 'digital-art',
                summary: 'Classic SF illustration styling.',
                promptTemplate:
                        'Render science-fiction illustration: confident hardware design, atmospheric haze, cool accent lighting and a strong sense of speculative scale.',
                keywords: ['sci-fi', 'hardware', 'future', 'scale']
        },
        {
                id: 'digital-surrealism',
                name: 'Surrealism',
                categoryId: 'digital-art',
                summary: 'Dream logic and impossible juxtaposition.',
                promptTemplate:
                        'Render surrealist artwork: impossible juxtaposition, dreamlike logic, hyper-clear rendering of illogical subject matter and quiet uncanny atmosphere.',
                videoTemplate:
                        'Surreal motion where impossible elements shift in ways that are smooth but physically wrong.',
                keywords: ['surreal', 'dream', 'juxtaposition', 'uncanny']
        },
        {
                id: 'digital-abstract',
                name: 'Abstract Art',
                categoryId: 'digital-art',
                summary: 'Non-representational colour and form.',
                promptTemplate:
                        'Render an abstract composition: non-representational colour fields, gestural marks, layered texture and tension between forms with no literal subject.',
                videoTemplate:
                        'Abstract motion: colour fields and marks that flow and morph continuously with no representational anchor.',
                keywords: ['abstract', 'colour field', 'gesture', 'form']
        },
        {
                id: 'geometric-art',
                name: 'Geometric Art',
                categoryId: 'digital-art',
                summary: 'Precise shape-driven compositions.',
                promptTemplate:
                        'Render geometric art: precise regular shapes, strong asymmetric balance, restrained palette and a clean constructed composition.',
                keywords: ['geometric', 'shapes', 'structure', 'precise']
        },
        {
                id: 'minimalist-illustration',
                name: 'Minimalist Illustration',
                categoryId: 'digital-art',
                summary: 'Reduced forms with generous space.',
                promptTemplate:
                        'Render a minimalist illustration: one clear subject, generous negative space, restrained palette, simple confident shapes and calm even lighting.',
                keywords: ['minimal', 'simple', 'space', 'reduced']
        },
        {
                id: 'maximalist-illustration',
                name: 'Maximalist Illustration',
                categoryId: 'digital-art',
                summary: 'Dense, layered, richly detailed art.',
                promptTemplate:
                        'Render a maximalist illustration: dense layered detail, many competing elements held in balance, saturated palette and controlled visual overload.',
                keywords: ['maximalist', 'dense', 'layered', 'ornate']
        },
        {
                id: 'editorial-illustration-shared',
                name: 'Editorial Illustration',
                categoryId: 'digital-art',
                summary: 'Publication-ready conceptual illustration.',
                promptTemplate:
                        'Render an editorial illustration: a clear conceptual metaphor, confident shapes, limited purposeful palette, intelligent negative space and a refined finish.',
                keywords: ['editorial', 'magazine', 'metaphor', 'concept']
        },
        {
                id: 'poster-art',
                name: 'Poster Art',
                categoryId: 'digital-art',
                summary: 'Bold graphic poster composition.',
                promptTemplate:
                        'Design poster art: a bold graphic composition, strong focal hierarchy, simplified shapes, limited palette and a striking thumbnail read.',
                preferredAspectRatios: ['2:3', '4:5'],
                keywords: ['poster', 'graphic', 'bold', 'print']
        }
] as StyleInput[]);

export const GROUP_ANIMATION = group([
        {
                id: '2d-animation',
                name: '2D Animation',
                categoryId: 'animation',
                summary: 'Hand-drawn-style two-dimensional motion.',
                promptTemplate:
                        'Render as 2D animation: clean cel-painted linework, flat colour fills, deliberate key poses and smooth traditional two-dimensional motion.',
                videoTemplate:
                        'Animate in 2D: cel-painted linework, flat fills, snappy key poses with controlled in-betweens and a stable line.',
                mediaTypes: ['video'],
                keywords: ['2d', 'cel', 'animation', 'traditional']
        },
        {
                id: '3d-animation',
                name: '3D Animation',
                categoryId: 'animation',
                summary: 'Fully modelled and rendered animation.',
                promptTemplate:
                        'Render as 3D animation: clean geometry, physically based materials, consistent global illumination and appealing rendered character motion.',
                videoTemplate:
                        'Animate in 3D: consistent geometry across frames, physically based materials, believable weight and rendered global illumination.',
                mediaTypes: ['video'],
                keywords: ['3d', 'cgi', 'animation', 'render']
        },
        {
                id: 'stylized-3d-animation',
                name: 'Stylised 3D',
                categoryId: 'animation',
                summary: 'Soft, appealing stylised 3D motion.',
                promptTemplate:
                        'Render stylised 3D animation: rounded appealing forms, soft global illumination, gentle subsurface warmth and a polished storybook finish.',
                videoTemplate:
                        'Animate in stylised 3D: rounded appealing forms, soft GI, bouncy appealing weight and a storybook finish.',
                keywords: ['stylised 3d', 'cute', 'soft', 'appealing']
        },
        {
                id: 'realistic-3d-animation',
                name: 'Realistic 3D',
                categoryId: 'animation',
                summary: 'Photoreal rendered 3D motion.',
                promptTemplate:
                        'Render realistic 3D animation: photoreal materials, accurate light transport, fine surface detail and lifelike rendered motion.',
                videoTemplate:
                        'Animate in realistic 3D: photoreal materials, accurate light transport and lifelike motion without visible animation artefacts.',
                keywords: ['realistic 3d', 'photoreal', 'render', 'simulation']
        },
        {
                id: 'stop-motion',
                name: 'Stop Motion',
                categoryId: 'animation',
                summary: 'Frame-by-frame physical animation.',
                promptTemplate:
                        'Render as stop-motion animation: physical miniature sets, visible material texture, subtle frame-by-frame imperfections and tactile handmade charm.',
                videoTemplate:
                        'Animate as stop motion: deliberate slight frame-by-frame stepping, tactile physical materials and handmade charm.',
                mediaTypes: ['video'],
                keywords: ['stop motion', 'miniature', 'tactile', 'handmade']
        },
        {
                id: 'clay-animation',
                name: 'Clay Animation',
                categoryId: 'animation',
                summary: 'Plasticine characters and sets.',
                promptTemplate:
                        'Render as clay animation: soft plasticine forms, visible fingerprint texture, matte pigment colour and warm handmade studio light.',
                videoTemplate:
                        'Animate in clay: plasticine forms that deform believably, fingerprint texture and warm studio light.',
                mediaTypes: ['video'],
                keywords: ['clay', 'plasticine', 'animation', 'handmade']
        },
        {
                id: 'paper-cut-animation',
                name: 'Paper-Cut Animation',
                categoryId: 'animation',
                summary: 'Layered cut-paper collage animation.',
                promptTemplate:
                        'Render as paper-cut animation: layered cut-paper shapes, visible paper edges, soft drop shadows and flat graphic staging.',
                videoTemplate:
                        'Animate as cut paper: layered paper shapes sliding and hinging with visible edges and soft contact shadows.',
                mediaTypes: ['video'],
                keywords: ['paper cut', 'collage', 'layered', 'flat']
        },
        {
                id: 'motion-graphics',
                name: 'Motion Graphics',
                categoryId: 'animation',
                summary: 'Designed animated graphics and transitions.',
                promptTemplate:
                        'Render as motion graphics: clean vector shapes, deliberate timing and easing, strong graphic hierarchy and purposeful animated transitions.',
                videoTemplate:
                        'Animate as motion graphics: crisp vector forms, decisive easing curves, rhythmic timing and clean transitions.',
                mediaTypes: ['video'],
                keywords: ['motion graphics', 'vector', 'transitions', 'kinetic']
        },
        {
                id: 'cel-shaded-animation',
                name: 'Cel-Shaded Animation',
                categoryId: 'animation',
                summary: '3D rendered with a flat cel look.',
                promptTemplate:
                        'Render cel-shaded animation: 3D form reduced to flat bands, crisp ink outlines, stepped shading and a hand-drawn surface appearance.',
                videoTemplate:
                        'Animate cel-shaded: 3D motion rendered with flat shading bands and crisp stable outlines.',
                keywords: ['cel shaded', 'toon', 'outline', 'flat shading']
        },
        {
                id: 'anime-inspired-animation',
                name: 'Anime-Inspired Animation',
                categoryId: 'animation',
                summary: 'Japanese-style key animation and timing.',
                promptTemplate:
                        'Render anime-inspired animation: expressive key animation, distinctive character acting, dynamic backgrounds and cinematic camera framing.',
                videoTemplate:
                        'Animate anime-style: expressive key poses, distinctive character acting, speed lines where motivated and cinematic framing.',
                mediaTypes: ['video'],
                keywords: ['anime', 'key animation', 'expressive', 'sakuga']
        },
        {
                id: 'chibi-animation',
                name: 'Chibi Animation',
                categoryId: 'animation',
                summary: 'Exaggerated small-proportion characters.',
                promptTemplate:
                        'Render chibi animation: exaggerated small-body proportions, oversized expressive heads, simple charm and bouncy appealing motion.',
                videoTemplate:
                        'Animate chibi: exaggerated squash-and-stretch, oversized expressive heads and bouncy cute motion.',
                keywords: ['chibi', 'cute', 'exaggerated', 'small']
        },
        {
                id: 'hand-drawn-animation',
                name: 'Hand-Drawn Animation',
                categoryId: 'animation',
                summary: 'Traditional drawn frame-by-frame motion.',
                promptTemplate:
                        'Render as hand-drawn animation: visible pencil construction, lively line quality, paper texture and the energy of frame-by-frame drawing.',
                videoTemplate:
                        'Animate hand-drawn: lively line quality that shifts frame to frame and the energy of drawn motion.',
                mediaTypes: ['video'],
                keywords: ['hand drawn', 'pencil', 'frame by frame', 'traditional']
        },
        {
                id: 'puppet-animation',
                name: 'Puppet Animation',
                categoryId: 'animation',
                summary: 'Articulated puppet performance.',
                promptTemplate:
                        'Render as puppet animation: articulated physical characters, fabric and felt materials, studio lighting and deliberate performed motion.',
                videoTemplate:
                        'Animate puppets: articulated jointed motion, fabric and felt materials and deliberate performed timing.',
                mediaTypes: ['video'],
                keywords: ['puppet', 'marionette', 'felt', 'articulated']
        },
        {
                id: 'experimental-animation',
                name: 'Experimental Animation',
                categoryId: 'animation',
                summary: 'Non-traditional animated form.',
                promptTemplate:
                        'Render experimental animation: unconventional technique, abstract or mixed media, deliberate rule-breaking and a strong personal visual language.',
                videoTemplate:
                        'Animate experimentally: unconventional technique, mixed media and deliberate rhythmic rule-breaking.',
                mediaTypes: ['video'],
                keywords: ['experimental', 'abstract', 'unconventional', 'mixed media']
        }
] as StyleInput[]);

export const GROUP_ANIME_COMIC = group([
        {
                id: 'anime',
                name: 'Anime',
                categoryId: 'anime-comic',
                summary: 'Modern Japanese animation framing and colour.',
                promptTemplate:
                        'Render in an anime style: clean cel-painted colour, expressive character design, crisp linework, dynamic composition and cinematic lighting cues.',
                videoTemplate:
                        'Animate in anime style: cel-painted colour, expressive acting, dynamic camera framing and crisp stable linework.',
                keywords: ['anime', 'cel', 'japan', 'expressive']
        },
        {
                id: 'manga-inspired',
                name: 'Manga-Inspired',
                categoryId: 'anime-comic',
                summary: 'Ink-drawn manga rendering.',
                promptTemplate:
                        'Render manga-inspired artwork: confident ink linework, screentone shading, high contrast and expressive panel composition.',
                keywords: ['manga', 'ink', 'screentone', 'panels']
        },
        {
                id: 'retro-anime',
                name: 'Retro Anime',
                categoryId: 'anime-comic',
                summary: 'Eighties and nineties anime look.',
                promptTemplate:
                        'Render as retro anime: era-accurate cel palette, visible film grain, simpler linework, painted backgrounds and a nostalgic analog finish.',
                videoTemplate:
                        'Animate as retro anime: era-accurate cel palette, film grain and simpler, period-correct linework.',
                keywords: ['retro anime', '80s', '90s', 'cel']
        },
        {
                id: 'modern-anime',
                name: 'Modern Anime',
                categoryId: 'anime-comic',
                summary: 'Contemporary digital anime finish.',
                promptTemplate:
                        'Render as modern anime: polished digital compositing, subtle gradient shading, crisp digital linework and cinematic post-processing light.',
                videoTemplate:
                        'Animate modern anime: polished compositing, subtle gradients and cinematic digital post light.',
                keywords: ['modern anime', 'digital', 'polished', 'contemporary']
        },
        {
                id: 'watercolor-anime',
                name: 'Watercolour Anime',
                categoryId: 'anime-comic',
                summary: 'Anime rendering with watercolour texture.',
                promptTemplate:
                        'Render watercolour anime: soft translucent washes behind clean character lines, bleeding colour edges, paper texture and a gentle nostalgic mood.',
                videoTemplate:
                        'Animate watercolour anime: clean character lines over washes that bloom and settle gently.',
                keywords: ['watercolour', 'anime', 'soft', 'washes']
        },
        {
                id: 'cinematic-anime',
                name: 'Cinematic Anime',
                categoryId: 'anime-comic',
                summary: 'Feature-film anime with filmic staging.',
                promptTemplate:
                        'Render cinematic anime: detailed painted backgrounds, filmic depth staging, dramatic motivated light and careful feature-film composition.',
                videoTemplate:
                        'Animate cinematic anime: detailed painted backgrounds, filmic staging and dramatic motivated camera light.',
                videoAspectRatios: ['2.39:1', '16:9'],
                keywords: ['cinematic anime', 'film', 'backgrounds', 'staging']
        },
        {
                id: 'comic-book-shared',
                name: 'Comic-Book Art',
                categoryId: 'anime-comic',
                summary: 'American comic inking with halftone.',
                promptTemplate:
                        'Render comic-book art: heavy ink outlines, dynamic anatomy, halftone shading, bold saturated colour and strong perspective.',
                videoTemplate:
                        'Animate as comic art: bold ink motion, dynamic poses and halftone shading that holds across frames.',
                keywords: ['comic', 'inking', 'halftone', 'superhero']
        },
        {
                id: 'graphic-novel-shared',
                name: 'Graphic-Novel Visuals',
                categoryId: 'anime-comic',
                summary: 'Restrained, atmospheric sequential art.',
                promptTemplate:
                        'Render graphic-novel art: restrained palette, textured inking, soft geometric shading, quiet atmosphere and cinematic panel staging.',
                videoTemplate:
                        'Animate graphic-novel style: restrained palette, textured inking and quiet cinematic panel staging.',
                keywords: ['graphic novel', 'muted', 'sequential', 'atmosphere']
        },
        {
                id: 'western-cartoon',
                name: 'Western Cartoon',
                categoryId: 'anime-comic',
                summary: 'Bold Western television cartoon styling.',
                promptTemplate:
                        'Render Western cartoon style: bold simplified shapes, thick consistent outlines, flat saturated colour and exaggerated expressive characters.',
                videoTemplate:
                        'Animate Western cartoon style: bold shapes, thick outlines and exaggerated expressive squash-and-stretch.',
                keywords: ['cartoon', 'western', 'bold', 'outline']
        },
        {
                id: 'saturday-cartoon',
                name: 'Saturday-Morning Cartoon',
                categoryId: 'anime-comic',
                summary: 'Bright classic TV animation.',
                promptTemplate:
                        'Render Saturday-morning cartoon style: bright flat colour, simple clean linework, busy energetic composition and cheerful exaggerated staging.',
                videoTemplate:
                        'Animate Saturday-cartoon style: bright flat colour, simple lines and energetic cheerful motion.',
                keywords: ['cartoon', 'classic tv', 'bright', 'energetic']
        },
        {
                id: 'stylized-superhero',
                name: 'Stylised Superhero',
                categoryId: 'anime-comic',
                summary: 'Heroic comic anatomy and lighting.',
                promptTemplate:
                        'Render stylised superhero art: heroic exaggerated anatomy, dramatic low-angle framing, bold ink shadows and a striking high-contrast palette.',
                videoTemplate:
                        'Animate stylised superhero: heroic pose-to-pose motion, dramatic low angles and bold ink shadows.',
                keywords: ['superhero', 'heroic', 'dramatic', 'comic']
        }
] as StyleInput[]);

export const GROUP_PAINTING = group([
        {
                id: 'oil-painting-shared',
                name: 'Oil Painting',
                categoryId: 'painting-traditional',
                summary: 'Rich impasto oil with visible strokes.',
                promptTemplate:
                        'Render as an oil painting: rich layered pigment, visible brush and palette-knife strokes, warm glazing, deep shadows and a varnished classical finish.',
                keywords: ['oil', 'impasto', 'canvas', 'classical']
        },
        {
                id: 'watercolour-shared',
                name: 'Watercolour',
                categoryId: 'painting-traditional',
                summary: 'Translucent washes and soft bleeds.',
                promptTemplate:
                        'Render as a watercolour painting: translucent layered washes, soft bleeding edges, visible paper texture, restrained palette and areas of unpainted white.',
                keywords: ['watercolour', 'washes', 'paper', 'soft']
        },
        {
                id: 'acrylic-painting',
                name: 'Acrylic Painting',
                categoryId: 'painting-traditional',
                summary: 'Fast-drying opaque acrylic colour.',
                promptTemplate:
                        'Render as an acrylic painting: opaque fast-drying colour, crisp edges, flat layered passages, visible brush texture and a contemporary finish.',
                keywords: ['acrylic', 'opaque', 'contemporary', 'brush']
        },
        {
                id: 'gouache-shared',
                name: 'Gouache',
                categoryId: 'painting-traditional',
                summary: 'Matte opaque painted colour.',
                promptTemplate:
                        'Render as a gouache painting: matte opaque colour, flat confident shapes, crisp edges, subtle brushwork and a graphic poster-like clarity.',
                keywords: ['gouache', 'matte', 'opaque', 'graphic']
        },
        {
                id: 'ink-illustration',
                name: 'Ink Illustration',
                categoryId: 'painting-traditional',
                summary: 'Pen and ink with deliberate washes.',
                promptTemplate:
                        'Render as an ink illustration: confident pen linework, cross-hatched shading, restrained ink wash and high contrast on toned paper.',
                keywords: ['ink', 'pen', 'wash', 'hatching']
        },
        {
                id: 'pencil-drawing',
                name: 'Pencil Drawing',
                categoryId: 'painting-traditional',
                summary: 'Graphite tonal drawing.',
                promptTemplate:
                        'Render as a graphite pencil drawing: fine pencil hatching, careful tonal modelling, visible paper grain and light construction lines.',
                keywords: ['pencil', 'graphite', 'tonal', 'drawing']
        },
        {
                id: 'charcoal-shared',
                name: 'Charcoal',
                categoryId: 'painting-traditional',
                summary: 'Soft charcoal with dramatic contrast.',
                promptTemplate:
                        'Render as a charcoal drawing: soft smudged passages, dramatic tonal contrast, rough paper tooth and expressive gestural marks.',
                keywords: ['charcoal', 'smudge', 'contrast', 'expressive']
        },
        {
                id: 'pastel',
                name: 'Pastel',
                categoryId: 'painting-traditional',
                summary: 'Chalky pastel with soft blended colour.',
                promptTemplate:
                        'Render as a pastel drawing: chalky pigment, soft blended transitions, visible tooth texture and luminous saturated colour.',
                keywords: ['pastel', 'chalk', 'blended', 'luminous']
        },
        {
                id: 'colored-pencil',
                name: 'Coloured Pencil',
                categoryId: 'painting-traditional',
                summary: 'Layered coloured pencil rendering.',
                promptTemplate:
                        'Render as coloured pencil artwork: fine layered pencil strokes, gradual tonal build-up, visible paper grain and precise detail.',
                keywords: ['coloured pencil', 'layered', 'fine', 'detail']
        },
        {
                id: 'woodcut',
                name: 'Woodcut',
                categoryId: 'painting-traditional',
                summary: 'Bold carved relief print.',
                promptTemplate:
                        'Render as a woodcut print: bold carved lines, flat black ink, high contrast, visible gouge marks and a graphic relief-print quality.',
                keywords: ['woodcut', 'relief', 'print', 'carved']
        },
        {
                id: 'linocut',
                name: 'Linocut',
                categoryId: 'painting-traditional',
                summary: 'Graphic linoleum relief print.',
                promptTemplate:
                        'Render as a linocut print: simplified carved shapes, flat ink colour, strong graphic contrast and visible cutting texture.',
                keywords: ['linocut', 'relief', 'graphic', 'print']
        },
        {
                id: 'etching',
                name: 'Etching',
                categoryId: 'painting-traditional',
                summary: 'Fine-line intaglio printmaking.',
                promptTemplate:
                        'Render as an etching: fine incised linework, delicate cross-hatching, plate tone and the light, precise quality of intaglio printing.',
                keywords: ['etching', 'intaglio', 'fine lines', 'print']
        },
        {
                id: 'fresco',
                name: 'Fresco-Inspired',
                categoryId: 'painting-traditional',
                summary: 'Aged wall-painting surface and colour.',
                promptTemplate:
                        'Render as fresco-inspired art: soft matte pigment on plaster, slightly muted earth palette, weathered surface and a monumental wall-painting quality.',
                keywords: ['fresco', 'plaster', 'mural', 'aged']
        },
        {
                id: 'impressionism',
                name: 'Impressionism',
                categoryId: 'painting-traditional',
                summary: 'Light and broken colour brushwork.',
                promptTemplate:
                        'Render in an impressionist style: broken colour brushwork, emphasis on shifting light, soft edges, visible strokes and an atmospheric outdoor quality.',
                keywords: ['impressionism', 'light', 'broken colour', 'plein air']
        },
        {
                id: 'expressionism',
                name: 'Expressionism',
                categoryId: 'painting-traditional',
                summary: 'Distorted form and heightened emotion.',
                promptTemplate:
                        'Render in an expressionist style: distorted form, exaggerated colour, agitated brushwork and heightened emotional intensity.',
                keywords: ['expressionism', 'distorted', 'emotion', 'bold']
        },
        {
                id: 'surrealist-painting',
                name: 'Surrealist Painting',
                categoryId: 'painting-traditional',
                summary: 'Painterly dream imagery.',
                promptTemplate:
                        'Render as surrealist painting: meticulously painted impossible imagery, dreamlike spatial logic, quiet uncanny atmosphere and smooth classical finish.',
                keywords: ['surrealist', 'dream', 'painted', 'impossible']
        },
        {
                id: 'classical-painting',
                name: 'Classical Painting',
                categoryId: 'painting-traditional',
                summary: 'Renaissance academic technique.',
                promptTemplate:
                        'Render as classical painting: academic modelling, harmonious composition, warm earth palette, chiaroscuro light and a varnished museum finish.',
                keywords: ['classical', 'academic', 'chiaroscuro', 'museum']
        },
        {
                id: 'art-nouveau',
                name: 'Art Nouveau',
                categoryId: 'painting-traditional',
                summary: 'Organic line and decorative ornament.',
                promptTemplate:
                        'Render in Art Nouveau style: flowing organic linework, ornamental borders, stylised botanical motifs, flat decorative colour and elegant patterning.',
                preferredAspectRatios: ['2:3', '4:5'],
                keywords: ['art nouveau', 'ornament', 'organic', 'decorative']
        },
        {
                id: 'art-deco',
                name: 'Art Deco',
                categoryId: 'painting-traditional',
                summary: 'Geometric glamour and metallic accents.',
                promptTemplate:
                        'Render in Art Deco style: geometric ornament, symmetrical composition, stepped forms, metallic accents and polished 1920s glamour.',
                keywords: ['art deco', 'geometric', 'glamour', '1920s']
        }
] as StyleInput[]);

export const GROUP_PHOTOGRAPHY_SHARED = group([
        {
                id: 'portrait-photography',
                name: 'Portrait Photography',
                categoryId: 'photography',
                summary: 'Composed portraiture with controlled light.',
                promptTemplate:
                        'Render as portrait photography: controlled key and rim light, shallow depth of field, natural skin texture, clean background and precise focus on the subject.',
                preferredAspectRatios: ['4:5', '2:3'],
                videoAspectRatios: ['9:16', '4:5'],
                keywords: ['portrait', 'people', 'lighting', 'focus']
        },
        {
                id: 'fashion-photography',
                name: 'Fashion Photography',
                categoryId: 'photography',
                summary: 'High-fashion editorial imagery.',
                promptTemplate:
                        'Render as fashion photography: deliberate posing, striking styling, controlled dramatic lighting, refined colour grading and a strong sense of attitude.',
                preferredAspectRatios: ['4:5', '2:3'],
                keywords: ['fashion', 'editorial', 'styling', 'attitude']
        },
        {
                id: 'editorial-photography',
                name: 'Editorial Photography',
                categoryId: 'photography',
                summary: 'Magazine-grade documentary imagery.',
                promptTemplate:
                        'Render as editorial photography: a strong narrative frame, precise composition, natural but controlled light and a considered colour treatment.',
                keywords: ['editorial', 'magazine', 'narrative', 'reportage']
        },
        {
                id: 'product-photography-shared',
                name: 'Product Photography',
                categoryId: 'photography',
                summary: 'Clean commercial packshot lighting.',
                promptTemplate:
                        'Render as commercial product photography: precise studio lighting, controlled reflections, seamless neutral background, accurate materials and sharp edge detail.',
                preferredAspectRatios: ['1:1', '4:5'],
                keywords: ['product', 'packshot', 'commercial', 'studio']
        },
        {
                id: 'architectural-photography',
                name: 'Architectural Photography',
                categoryId: 'photography',
                summary: 'Corrected-perspective building imagery.',
                promptTemplate:
                        'Render as architectural photography: corrected verticals, precise perspective, balanced daylight, clean composition and honest material rendering.',
                videoAspectRatios: ['16:9', '3:2'],
                keywords: ['architecture', 'buildings', 'perspective', 'verticals']
        },
        {
                id: 'landscape-photography-shared',
                name: 'Landscape Photography',
                categoryId: 'photography',
                summary: 'Sweeping natural vistas.',
                promptTemplate:
                        'Render as landscape photography: a sweeping natural vista, layered atmospheric depth, natural light, rich but accurate colour and careful focus through the frame.',
                preferredAspectRatios: ['16:9', '3:2'],
                keywords: ['landscape', 'vista', 'natural', 'depth']
        },
        {
                id: 'wildlife-photography',
                name: 'Wildlife Photography',
                categoryId: 'photography',
                summary: 'Long-lens animal portraiture.',
                promptTemplate:
                        'Render as wildlife photography: a long-lens compressed perspective, animal in natural behaviour, soft background separation and authentic habitat detail.',
                keywords: ['wildlife', 'animal', 'long lens', 'nature']
        },
        {
                id: 'macro-photography',
                name: 'Macro Photography',
                categoryId: 'photography',
                summary: 'Extreme close-up natural detail.',
                promptTemplate:
                        'Render as macro photography: extreme close-up detail, razor-thin depth of field, soft natural light, visible surface texture and a defocused background.',
                keywords: ['macro', 'close-up', 'texture', 'shallow focus']
        },
        {
                id: 'aerial-photography',
                name: 'Aerial Photography',
                categoryId: 'photography',
                summary: 'High-oblique aerial perspective.',
                promptTemplate:
                        'Render as aerial photography: a high vantage point, graphic terrain patterns, even daylight, crisp detail and a strong sense of scale.',
                videoTemplate:
                        'Aerial motion: a smooth high-altitude flight revealing graphic terrain patterns and scale.',
                videoAspectRatios: ['16:9', '1:1'],
                keywords: ['aerial', 'drone', 'high angle', 'scale']
        },
        {
                id: 'street-photography',
                name: 'Street Photography',
                categoryId: 'photography',
                summary: 'Candid urban observation.',
                promptTemplate:
                        'Render as street photography: a candid unposed urban moment, available light, layered foreground detail and an observational, decisive framing.',
                videoTemplate:
                        'Street-photography motion: handheld observational camera, available light and unposed passing subjects.',
                keywords: ['street', 'candid', 'urban', 'documentary']
        },
        {
                id: 'long-exposure',
                name: 'Long-Exposure Photography',
                categoryId: 'photography',
                summary: 'Motion blurred by time.',
                promptTemplate:
                        'Render as long-exposure photography: silky motion-blurred movement, smooth light trails, deep contrast and a tranquil sense of compressed time.',
                videoTemplate:
                        'Long-exposure motion: continuous silky blur and glowing light trails moving smoothly through frame.',
                keywords: ['long exposure', 'blur', 'light trails', 'time']
        },
        {
                id: 'infrared-photography',
                name: 'Infrared-Inspired Photography',
                categoryId: 'photography',
                summary: 'False-colour infrared tonality.',
                promptTemplate:
                        'Render as infrared-inspired photography: glowing white foliage, unusually dark skies, false-colour tonality and an ethereal otherworldly mood.',
                keywords: ['infrared', 'false colour', 'ethereal', 'foliage']
        },
        {
                id: 'analog-film-photography',
                name: 'Analog-Film Photography',
                categoryId: 'photography',
                summary: 'Uncoated analogue colour response.',
                promptTemplate:
                        'Render as analog-film photography: organic grain, gentle highlight halation, slightly uncoated colour and the honest imperfection of real film.',
                keywords: ['analog', 'film', 'grain', 'halation']
        },
        {
                id: 'vintage-photography',
                name: 'Vintage Photography',
                categoryId: 'photography',
                summary: 'Faded archival print tonality.',
                promptTemplate:
                        'Render as vintage photography: restored archival tonality, softened contrast, warm faded colour or sepia and the texture of an old print.',
                keywords: ['vintage', 'archival', 'sepia', 'faded']
        },
        {
                id: 'black-and-white-photography',
                name: 'Black-and-White Photography',
                categoryId: 'photography',
                summary: 'Full-range monochrome tonality.',
                promptTemplate:
                        'Render as black-and-white photography: a full tonal range, strong contrast, rich blacks, clean highlights and deliberate use of shape and texture.',
                keywords: ['black and white', 'monochrome', 'tonal', 'contrast']
        },
        {
                id: 'high-key-photography',
                name: 'High-Key Photography',
                categoryId: 'photography',
                summary: 'Bright, low-contrast and airy.',
                promptTemplate:
                        'Render as high-key photography: bright even illumination, minimal shadow, clean white background and a light, optimistic, airy mood.',
                keywords: ['high key', 'bright', 'airy', 'light']
        },
        {
                id: 'low-key-photography',
                name: 'Low-Key Photography',
                categoryId: 'photography',
                summary: 'Dark, shadow-dominant lighting.',
                promptTemplate:
                        'Render as low-key photography: a single controlled light, deep surrounding shadow, sculpted form and a dramatic, moody atmosphere.',
                keywords: ['low key', 'dark', 'dramatic', 'shadow']
        },
        {
                id: 'studio-photography',
                name: 'Studio Photography',
                categoryId: 'photography',
                summary: 'Fully controlled studio lighting.',
                promptTemplate:
                        'Render as studio photography: a deliberate multi-light setup, seamless backdrop, precise exposure and immaculate, controlled detail.',
                keywords: ['studio', 'lighting', 'controlled', 'backdrop']
        }
] as StyleInput[]);
