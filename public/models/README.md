# Avatar Model Directory

Place your custom humanoid GLB model here as `avatar.glb`

## Requirements

- **Format**: `.glb` or `.gltf` (binary GLTF preferred)
- **Rigging**: Humanoid skeleton with standard bone names
- **Recommended bone names** (for head/eye/neck tracking):
  - `Head`, `head`, `HEAD`
  - `Neck`, `neck`, `NECK`
  - `Spine`, `spine`, `SPINE`, `Spine3`, `Chest`, `chest`
  - `LeftShoulder`, `leftShoulder`, `Shoulder_L`, `Clavicle_L`
  - `RightShoulder`, `rightShoulder`, `Shoulder_R`, `Clavicle_R`
  - `LeftEye`, `leftEye`, `Eye_L`
  - `RightEye`, `rightEye`, `Eye_R`

## Animation Clips (Optional)

If your model includes animations, the system will automatically detect and use:
- **Idle/Breathing/Standing** - Used as the primary idle animation
- Other animations are available but not auto-played

## Fallback

If no `avatar.glb` is found, or if the model fails to load, a procedural humanoid placeholder will be displayed that matches the red/black theme and supports all mouse tracking features.

## Performance Tips

- Keep polygon count reasonable (~10k-30k triangles)
- Use compressed textures (KTX2/BasisU) when possible
- Optimize for real-time rendering (single draw call per material ideal)
- Consider providing LOD variants if needed

## Scale

The avatar is scaled to ~2.8x in the scene. Model should be roughly human-proportioned at unit scale (1 unit ≈ 1 meter).