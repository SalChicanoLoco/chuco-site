export const MODEL_REGISTRY = {
  fish_schooling: {
    path: '/assets/models/fish-schooling.glb',
    fallback: 'proceduralFish',
    scale: 0.85,
    rotationY: Math.PI,
    mobileMax: 6,
    desktopMax: 12,
    status: 'pending_asset'
  },
  fish_cichlid: {
    path: '/assets/models/fish-cichlid.glb',
    fallback: 'proceduralFish',
    scale: 0.92,
    rotationY: Math.PI,
    mobileMax: 4,
    desktopMax: 8,
    status: 'pending_asset'
  },
  chuco_guardian: {
    path: '/assets/models/chuco-cleaner.glb',
    fallback: 'proceduralChuco',
    scale: 1.0,
    rotationY: Math.PI,
    mobileMax: 1,
    desktopMax: 1,
    status: 'pending_asset'
  },
  cleaner_shrimp: {
    path: '/assets/models/shrimp.glb',
    fallback: 'proceduralCleaner',
    scale: 0.7,
    rotationY: Math.PI,
    mobileMax: 2,
    desktopMax: 4,
    status: 'pending_asset'
  }
};

export const MODEL_RUNTIME_RULES = {
  cacheModels: true,
  useInstancingForSchools: true,
  preferGLB: true,
  fallbackAllowed: true,
  maxTextureSizeMobile: 1024,
  maxTextureSizeDesktop: 2048,
  maxShadowMapMobile: 1024,
  maxShadowMapDesktop: 2048
};
