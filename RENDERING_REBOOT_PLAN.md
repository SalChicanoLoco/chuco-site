# Rendering Reboot Plan (Awe + Performance)

## Why it still looks like a toy
1. **Primitive geometry**: the axolotl is mostly ellipses/circles, so silhouette + anatomy read as clip-art.
2. **No coherent art direction**: UI polish improved, but character style, fish style, and background style don't match.
3. **No material model**: almost no normal/specular response, caustics, rim lighting, or believable translucency.
4. **Animation lacks secondary motion**: body moves as one rigid blob; no tail chain / gill flutter.
5. **Low visual hierarchy**: foreground subject doesn’t strongly separate from the environment.

## Reboot architecture (mobile-safe)
- **Renderer**: keep Canvas2D for compatibility, but layer effects intentionally.
- **Character**: switch from procedural circles to **authored sprite pipeline**:
  - 1 hero atlas: idle(8), swim(8), nibble(6), rest(6)
  - optional normal map for fake directional light
- **Animation**:
  - CPU-cheap skeletal offsets for tail/gills (2-4 bones)
  - blend procedural steering with clip animation
- **Lighting stack**:
  - background gradient + subtle caustic texture scrolling
  - rim light on hero
  - soft contact shadow under hero
- **Performance budget**:
  - 60fps target desktop, 30-60fps mobile
  - quality ladder controlling bubbles/particles/post effects only

## Interaction loop upgrade
- Feed => nibble animation + micro-particles + satiation state
- Pet => trust pulse + approach behavior window
- Toy => chase mode with short cooldown and reward variance
- Light => curiosity boost + exploration spline path

## Immediate implementation order
1. Replace axolotl procedural draw with single-image sprite render path.
2. Add tiny state machine for animation clips.
3. Add caustic overlay + contact shadow.
4. Tune UI spacing/contrast after hero render is fixed.

## Definition of done
- One hero axolotl that reads clearly at first glance.
- Character silhouette remains recognizable at 0.5x scale.
- Interactions visibly change animation state within <150ms.
- No sustained frame drops below 30fps on mid-tier phones.
