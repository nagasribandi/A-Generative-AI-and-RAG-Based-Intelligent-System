// Site configuration — Firebase backed
import { fbGetConfig, fbToggleFeature } from './firebase';
import { ref, set, getDatabase } from 'firebase/database';

const DEFAULTS = {
  features: {
    imageUpload: true,
    geminiAI: true,
    allowSignup: true,
    leaderboard: true
  }
};

export async function getSiteConfig() {
  try {
    return await fbGetConfig();
  } catch (err) {
    console.error('getSiteConfig error:', err);
    return DEFAULTS;
  }
}

export async function saveSiteConfig(cfg) {
  const db = getDatabase();
  await set(ref(db, 'config'), cfg);
}

export async function toggleFeature(featureKey) {
  const result = await fbToggleFeature(featureKey);
  return result.features[featureKey];
}

export async function resetConfig() {
  const db = getDatabase();
  await set(ref(db, 'config'), DEFAULTS);
  return DEFAULTS;
}
