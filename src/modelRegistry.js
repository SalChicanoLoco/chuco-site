export const MODEL_REGISTRY = {
  fish_schooling: {
    role: 'fish',
    path: '/assets/models/base/base-fish.gltf',
    futureFinalPath: '/assets/models/fish-schooling.glb',
    emergencyFactory: 'proceduralFish',
    scale: 1.0,
    rotationY: Math.PI,
    mobileMax: 6,
    desktopMax: 12,
    status: 'base_model_committed'
  },
  fish_cichlid: {
    role: 'fish',
    path: '/assets/models/base/base-cichlid.gltf',
    futureFinalPath: '/assets/models/fish-cichlid.glb',
    emergencyFactory: 'proceduralFish',
    scale: 1.05,
    rotationY: Math.PI,
    mobileMax: 4,
    desktopMax: 8,
    status: 'base_model_committed'
  },
  chuco_guardian: {
    role: 'chuco',
    path: '/assets/models/base/base-chuco.gltf',
    futureFinalPath: '/assets/models/chuco-cleaner.glb',
    emergencyFactory: 'proceduralChuco',
    scale: 1.0,
    rotationY: Math.PI,
    mobileMax: 1,
    desktopMax: 1,
    status: 'base_model_committed'
  },
  bottom_cleaner: {
    role: 'cleaner',
    path: '/assets/models/base/base-cleaner.gltf',
    futureFinalPath: '/assets/models/bottom-cleaner.glb',
    emergencyFactory: 'proceduralCleaner',
    scale: 0.85,
    rotationY: Math.PI,
    mobileMax: 2,
    desktopMax: 4,
    status: 'base_model_committed'
  }
};

export const MODEL_RUNTIME_RULES = {
  cacheModels: true,
  preferCommittedBaseModels: true,
  useProceduralEmergencyFallback: true,
  useInstancingForSchools: true,
  maxTextureSizeMobile: 1024,
  maxTextureSizeDesktop: 2048,
  maxShadowMapMobile: 1024,
  maxShadowMapDesktop: 2048
};
