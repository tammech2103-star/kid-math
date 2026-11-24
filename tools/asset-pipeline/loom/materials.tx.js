// @skill loom
// @asset-pipeline 21 lessons — reusable seamless CSS background materials.
// @gameIds mario-bros,mario-odyssey,donkey-kong-country,pokemon,zelda,animal-crossing,mario-party,dr-mario,mario-maker,mario-paint,yoshi-island,luigis-mansion,brain-age,mario-and-luigi,pikmin,kirby,warioware,super-smash-bros,fire-emblem,splatoon,mario-kart
// @lessonIds intro,b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12,b13,b14,b15,b16,b17,b18,b19,b20
// @original original character, no existing franchise character, no logo, no copyright
// @consume Asset/v2/loom/<name>/<name>_albedo.png

// @asset wood_grain
// @gameId donkey-kong-country
// @lessonId b2
// @style carved-wood
// @consume Asset/v2/loom/wood_grain/wood_grain_albedo.png
// @asset felt_cloth
// @gameId animal-crossing
// @lessonId b5
// @style felt-fabric
// @consume Asset/v2/loom/felt_cloth/felt_cloth_albedo.png
// @asset paper_fiber
// @gameId pokemon
// @lessonId b3
// @style paper-cut
// @consume Asset/v2/loom/paper_fiber/paper_fiber_albedo.png
// @asset ink_wash
// @gameId luigis-mansion
// @lessonId b11
// @style ink-wash
// @consume Asset/v2/loom/ink_wash/ink_wash_albedo.png
// @asset yarn_knit
// @gameId pikmin
// @lessonId b14
// @style yarn
// @consume Asset/v2/loom/yarn_knit/yarn_knit_albedo.png
// @asset patchwork_fabric
// @gameId mario-kart
// @lessonId b20
// @style patchwork
// @consume Asset/v2/loom/patchwork_fabric/patchwork_fabric_albedo.png

pal({
  woodD: "#7A4F2E", wood: "#B07A45", woodL: "#D9A663", seam: "#5B3A22",
  feltD: "#D96B86", felt: "#FF9BB3", feltL: "#FFD1DC",
  paperD: "#EFE6CF", paper: "#FFF8E7", paperL: "#FFFFFF",
  inkD: "#2B2440", ink: "#3E6B54", inkL: "#8AD7FF",
  blue: "#8AD7FF", green: "#7FD08A", gold: "#FFD84D"
})

// 1. Carved wood: boards + long grain + fine speckle.
const boards = planks({ rows: 6, per: 2, gap: 0.008, bevel: 0.012, grain: 40, seed: 4 }).as("boards")
const grainFine = noise({ scale: 90, octaves: 2, seed: 3 })
// planks().grain is not periodic at the tile edge; stretched noise is.
const woodStreak = noise({ scale: [48, 6], octaves: 3, seed: 31 })
const woodHeight = boards.mask.mul(0.7).add(woodStreak.mul(0.14)).add(grainFine.mul(0.05))
material("wood_grain", { size: 256, depth: 0.02 }, {
  height: woodHeight,
  color: ramp(boards.id.mix(woodStreak, 0.35), ["woodD", "wood", "woodL"]).mix("seam", boards.mask.invert()),
  rough: noise({ scale: 16, seed: 9 }).levels(0, 1, 0.62, 0.88)
})

// 2. Felt: tight weave with a fuzzy noise top.
const feltWeave = weave({ threads: 12, gap: 0.16, seed: 2 }).as("feltWeave")
const feltNoise = noise({ scale: 90, octaves: 3, seed: 5 })
material("felt_cloth", { size: 256, depth: 0.012 }, {
  height: feltWeave.mask.mul(0.6).add(feltNoise.mul(0.12)),
  color: ramp(feltNoise.mix(feltWeave.mask, 0.35), ["feltD", "felt", "feltL"]),
  rough: feltNoise.levels(0, 1, 0.82, 0.95)
})

// 3. Paper: two scales of fibre, almost flat relief.
const paperCoarse = noise({ scale: 120, octaves: 3, seed: 7 })
const paperFine = noise({ scale: 180, octaves: 2, seed: 11 })
material("paper_fiber", { size: 256, depth: 0.004 }, {
  height: paperCoarse.mul(0.5).add(paperFine.mul(0.25)),
  color: ramp(paperCoarse.mix(paperFine, 0.4), ["paperD", "paper", "paperL"]),
  rough: paperCoarse.levels(0, 1, 0.78, 0.93)
})

// 4. Ink wash: wavy bands broken up by soft noise.
const inkBands = waves({ count: 5, dir: 20, warp: 0.5, scale: 4, seed: 6 }).as("inkBands")
const inkNoise = noise({ scale: 22, octaves: 4, seed: 8 })
material("ink_wash", { size: 256, depth: 0.006 }, {
  height: inkBands.mul(0.5).add(inkNoise.mul(0.2)),
  color: ramp(inkBands.mix(inkNoise, 0.45), ["inkD", "ink", "inkL"]),
  rough: inkNoise.levels(0, 1, 0.55, 0.8)
})

// 5. Knitted yarn: coarse weave with chunky loops.
const knitWeave = weave({ threads: 8, gap: 0.22, seed: 13 }).as("knitWeave")
const knitNoise = noise({ scale: 60, octaves: 3, seed: 15 })
material("yarn_knit", { size: 256, depth: 0.025 }, {
  height: knitWeave.mask.mul(0.85).add(knitNoise.mul(0.1)),
  color: ramp(knitNoise.mix(knitWeave.mask, 0.45), ["feltD", "felt", "feltL"]),
  rough: knitNoise.levels(0, 1, 0.8, 0.95)
})

// 6. Patchwork: tile grid, cream stitches in the gaps.
const patches = tiles({ rows: 8, cols: 8, gap: 0.02, bevel: 0.01, seed: 17 }).as("patches")
const patchNoise = noise({ scale: 50, octaves: 3, seed: 23 })
material("patchwork_fabric", { size: 256, depth: 0.018 }, {
  height: patches.mask.mul(0.7).add(patchNoise.mul(0.1)),
  color: ramp(patches.id.mix(patchNoise, 0.35), ["felt", "gold", "blue", "green"])
    .mix("paper", patches.mask.invert()),
  rough: patchNoise.levels(0, 1, 0.7, 0.9)
})
