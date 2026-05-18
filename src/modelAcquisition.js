export const MODEL_ACQUISITION = {
  phase: 'model_acquisition_and_runtime_registry',
  updated: '2026-05-18',
  graphTable: 'CHUCO_MODEL_GRAPH',
  summary: 'Runtime is real Three.js 3D with procedural low-poly fallbacks. Acquisition lane is active; no third-party model has been accepted until license and performance gates pass.',
  gates: [
    { id: 'L0', label: 'License gate', state: 'active', detail: 'CC0/public-domain preferred; GPL-compatible attribution required for any third-party asset.' },
    { id: 'P0', label: 'WebGL budget', state: 'active', detail: 'Mobile first: low-poly GLB, capped particles, shared materials, no heavy post chain.' },
    { id: 'R0', label: 'Runtime registry', state: 'wired', detail: 'Model registry exists; GLTF loader cache and fallback pipeline are next.' },
    { id: 'Q0', label: 'QA gate', state: 'pending', detail: 'Needs Cloudflare preview build and browser/device verification.' }
  ],
  slots: [
    { slot: 'fish_schooling', target: '/assets/models/fish-schooling.glb', state: 'fallback_active', fallback: 'proceduralFish', note: 'Need one vetted base fish GLB. Procedural mesh remains emergency path only.' },
    { slot: 'fish_cichlid', target: '/assets/models/fish-cichlid.glb', state: 'candidate_search', fallback: 'proceduralFish', note: 'Second fish body profile for species variation.' },
    { slot: 'chuco_guardian', target: '/assets/models/chuco-cleaner.glb', state: 'candidate_search', fallback: 'proceduralChuco', note: 'Axolotl/salamander-like guardian; must ignore pellet feed and patrol biofilter/algae zones.' },
    { slot: 'cleaner_shrimp', target: '/assets/models/shrimp.glb', state: 'candidate_search', fallback: 'proceduralCleaner', note: 'Bottom/driftwood cleaner species.' },
    { slot: 'plants_driftwood', target: '/assets/models/plants-driftwood.glb', state: 'candidate_search', fallback: 'proceduralEnvironment', note: 'Environmental realism without high draw-call overhead.' }
  ],
  sourceLeads: [
    { source: 'OpenGameArt', status: 'researching', licenseRisk: 'mixed', use: 'Free/open game assets; every item requires per-asset license check.' },
    { source: 'Poly Haven', status: 'researching', licenseRisk: 'low_for_CC0_assets', use: 'Likely best for CC0 textures/HDRI/environment materials rather than fish models.' },
    { source: 'Kenney / Quaternius-style packs', status: 'researching', licenseRisk: 'verify_per_pack', use: 'Potential low-poly mobile-safe models if license and species fit pass.' },
    { source: 'Sketchfab / Fab', status: 'caution', licenseRisk: 'mixed', use: 'Only use clearly downloadable Creative Commons assets with attribution captured.' },
    { source: 'Blender-generated fallback', status: 'recommended', licenseRisk: 'project_owned', use: 'Best guaranteed bundled fallback GLB if third-party acquisition stalls.' }
  ]
};
