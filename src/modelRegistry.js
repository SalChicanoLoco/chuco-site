export const MODEL_REGISTRY = {
  fish_schooling: {
    path: '/assets/models/fish-schooling.glb',
    backupPath: '/assets/models/fallback/fallback-fish.glb',
    emergencyFactory: 'proceduralFish',
    scale: 0.85,
    backupScale: 0.95,
    rotationY: Math.PI,
    mobileMax: 6,
    desktopMax: 12,
    status: 'pending_final_asset'
  },
  fish_cichlid: {
    path: '/assets/models/fish-cichlid.glb',
    backupPath: '/assets/models/fallback/fallback-cichlid.glb',
    emergencyFactory: 'proceduralFish',
    scale: 0.92,
    backupScale: 1.02,
    rotationY: Math.PI,
    mobileMax: 4,
    desktopMax: 8,
    status: 'pending_final_asset'
  },
  chuco_guardian: {
    path: '/assets/models/chuco-cleaner.glb',
    backupPath: '/assets/models/fallback/fallback-chuco.glb',
    emergencyFactory: 'proceduralChuco',
    scale: 1.0,
    backupScale: 1.0,
    rotationY: Math.PI,
    mobileMax: 1,
    desktopMax: 1,
    status: 'pending_final_asset'
  },
  bottom_cleaner: {
    path: '/assets/models/bottom-cleaner.glb',
    backupPath: '/assets/models/fallback/fallback-cleaner.glb',
    emergencyFactory: 'proceduralCleaner',
    scale: 0.7,
    backupScale: 0.85,
    rotationY: Math.PI,
    mobileMax: 2,
    desktopMax: 4,
    status: 'pending_final_asset'
  }
};

export const MODEL_RUNTIME_RULES = {
  cacheModels: true,
  useBundledBackupGLB: true,
  useProceduralEmergencyFallback: true,
  useInstancingForSchools: true,
  preferGLB: true,
  fallbackAllowed: true,
  maxTextureSizeMobile: 1024,
  maxTextureSizeDesktop: 2048,
  maxShadowMapMobile: 1024,
  maxShadowMapDesktop: 2048
};
