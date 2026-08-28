import {
  ALPHA_TAGS,
  QUALITY_TAGS,
  UC_PRESETS,
  inpaintModelId,
  joinTags,
  modelById,
  randomSeed,
  snap64,
} from './config.js';
import { arrayBufferToBase64 } from './api.js';
import { session } from './state.js';

function composePositive(fields) {
  return joinTags(fields.prefix, fields.main, fields.suffix);
}

export function currentPositive(fields) {
  return composePositive(fields);
}

export async function buildGenerateRequest(fields, client, onProgress) {
  const model = modelById(fields.model);
  let prompt = composePositive(fields);

  if (fields.dataset === 'fur' && !prompt.toLowerCase().includes('fur dataset')) {
    prompt = joinTags('fur dataset', prompt);
  }
  if (fields.dataset === 'background' && !prompt.toLowerCase().includes('background dataset')) {
    prompt = joinTags('background dataset', prompt);
  }
  if (fields.quality) {
    prompt = joinTags(prompt, QUALITY_TAGS[model.id] || 'masterpiece, very aesthetic');
  }
  if (fields.alpha && model.alpha) {
    prompt = joinTags(prompt, ALPHA_TAGS);
  }

  const uc = UC_PRESETS[Number(fields.uc)] || UC_PRESETS[0];
  const negative = joinTags(uc.tags, fields.negative);
  const seed = Number.isFinite(fields.seed) && fields.seed >= 0 ? Math.floor(fields.seed) : randomSeed();
  const width = snap64(fields.width);
  const height = snap64(fields.height);
  const chars = session.characters
    .filter(item => item.prompt.trim())
    .slice(0, model.maxCharacters);

  const parameters = {
    width,
    height,
    n_samples: Math.max(1, Math.min(4, Number(fields.samples) || 1)),
    seed,
    extra_noise_seed: seed,
    sampler: fields.sampler,
    steps: Number(fields.steps),
    scale: Number(fields.scale),
    cfg_rescale: Number(fields.cfgRescale || 0),
    noise_schedule: fields.schedule,
    legacy: false,
    legacy_v3_extend: false,
    params_version: model.paramsVersion,
    add_original_image: true,
    legacy_uc: false,
    v4_prompt: {
      caption: {
        base_caption: prompt,
        char_captions: chars.map(item => ({
          char_caption: item.prompt,
          centers: [{ x: item.x, y: item.y }],
        })),
      },
      use_coords: Boolean(session.useCoords && chars.length),
      use_order: true,
      legacy_uc: false,
    },
    v4_negative_prompt: {
      caption: {
        base_caption: negative,
        char_captions: chars.map(item => ({
          char_caption: item.uc || '',
          centers: [{ x: item.x, y: item.y }],
        })),
      },
      use_coords: false,
      use_order: false,
      legacy_uc: false,
    },
  };

  if (fields.sampler === 'k_euler_ancestral') {
    parameters.deliberate_euler_ancestral_bug = false;
    parameters.prefer_brownian = true;
  }
  if (fields.variety && model.family === 'v45') {
    parameters.skip_cfg_above_sigma = 58;
  }

  if (model.precise && session.precise.length) {
    parameters.director_reference_images = session.precise.map(item => item.base64);
    parameters.director_reference_descriptions = session.precise.map(item => ({
      caption: { base_caption: item.kind, char_captions: [] },
      legacy_uc: false,
    }));
    parameters.director_reference_information_extracted = session.precise.map(() => 1);
    parameters.director_reference_strength_values = session.precise.map(item => Number(item.strength));
    parameters.director_reference_secondary_strength_values = session.precise.map(
      item => 1 - Number(item.fidelity),
    );
  } else if (model.vibe && session.vibes.length) {
    const tokens = [];
    for (let i = 0; i < session.vibes.length; i += 1) {
      onProgress?.(`Vibe encoding ${i + 1}/${session.vibes.length}`);
      const item = session.vibes[i];
      const response = await client.encodeVibe({
        image: item.base64,
        information_extracted: Number(item.information),
        model: model.id,
      });
      tokens.push(arrayBufferToBase64(await response.arrayBuffer()));
    }
    parameters.reference_image_multiple = tokens;
    parameters.reference_strength_multiple = session.vibes.map(item => Number(item.strength));
    parameters.normalize_reference_strength_multiple = true;
  }

  let action = 'generate';
  let payloadModel = model.id;
  if (session.baseImage) {
    if (session.imageMode === 'img2img') {
      action = 'img2img';
      parameters.image = session.baseImage.base64;
      parameters.strength = Number(fields.strength);
      parameters.noise = Number(fields.noise);
    } else {
      if (!session.maskImage) throw new Error('Inpaint 마스크를 먼저 올리세요.');
      action = 'infill';
      payloadModel = inpaintModelId(model.id);
      parameters.image = session.baseImage.base64;
      parameters.mask = session.maskImage.base64;
      parameters.add_original_image = true;
      parameters.inpaintImg2ImgStrength = Number(fields.strength);
      parameters.noise = Number(fields.noise);
    }
  }

  return {
    input: prompt,
    model: payloadModel,
    action,
    parameters,
  };
}
