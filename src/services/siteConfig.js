// Simple site configuration stored in localStorage
const CONFIG_KEY = 'smart_campus_config';

const DEFAULTS = {
  features: {
    imageUpload: true,
    geminiAI: true,
    allowSignup: true,
    leaderboard: true
  }
};

export function getSiteConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULTS));
    return DEFAULTS;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULTS));
    return DEFAULTS;
  }
}

export function saveSiteConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function toggleFeature(featureKey) {
  const cfg = getSiteConfig();
  if (cfg.features && typeof cfg.features[featureKey] !== 'undefined') {
    cfg.features[featureKey] = !cfg.features[featureKey];
    saveSiteConfig(cfg);
    return cfg.features[featureKey];
  }
  return null;
}

export function resetConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULTS));
  return DEFAULTS;
}
