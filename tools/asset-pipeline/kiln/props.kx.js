// @skill kiln
// @asset-pipeline 21 lessons — 6 shared low-poly props (decorative only).
// @gameIds mario-bros,mario-odyssey,donkey-kong-country,pokemon,zelda,animal-crossing,mario-party,dr-mario,mario-maker,mario-paint,yoshi-island,luigis-mansion,brain-age,mario-and-luigi,pikmin,kirby,warioware,super-smash-bros,fire-emblem,splatoon,mario-kart
// @lessonIds intro,b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12,b13,b14,b15,b16,b17,b18,b19,b20
// @original original character, no existing franchise character, no logo, no copyright
// @consume Asset/v2/kiln/<name>.png (static web sprite); GLB is master-only, never loaded at runtime

// @asset wood_chest
// @gameId zelda
// @lessonId b4
// @style wax-crayon
// @consume Asset/v2/kiln/wood_chest.png
// @asset wood_step
// @gameId donkey-kong-country
// @lessonId b2
// @style carved-wood
// @consume Asset/v2/kiln/wood_step.png
// @asset pip_dice
// @gameId mario-party
// @lessonId b6
// @style plastic-bricks
// @consume Asset/v2/kiln/pip_dice.png
// @asset yarn_block
// @gameId pikmin
// @lessonId b14
// @style yarn
// @consume Asset/v2/kiln/yarn_block.png
// @asset flag_pedestal
// @gameId super-smash-bros
// @lessonId b17
// @style neon-vector
// @consume Asset/v2/kiln/flag_pedestal.png
// @asset path_tile
// @gameId mario-kart
// @lessonId b20
// @style patchwork
// @consume Asset/v2/kiln/path_tile.png

// Chunky bevels, 2-3 tones per material, light from above. No text or logos.
pal({
  wood: "#B07A45", woodD: "#7A4F2E", woodL: "#D9A663",
  gold: "#FFD84D", goldD: "#C98A17",
  ivory: "#FFF8E7", dot: "#2B2440",
  yarn: "#FF9BB3", yarnL: "#FFD1DC", yarnD: "#D96B86",
  stone: "#8E9BB5", stoneL: "#C3CCE0", stoneD: "#5B6785",
  pole: "#E8E4D8", flag: "#F2695C"
})

model("wood_chest",
  box(1.2, 0.65, 0.8, { mat: "wood", bevel: 0.05 }),
  box(1.25, 0.22, 0.85, { mat: "woodD", bevel: 0.04, pos: [0, 0.66, 0] }),
  box(1.28, 0.05, 0.88, { mat: "woodL", pos: [0, 0.78, 0] }),
  box(0.18, 0.22, 0.06, { mat: "gold", bevel: 0.02, pos: [0, 0.55, 0.43] }),
  sym("x", box(0.08, 0.68, 0.86, { mat: "goldD", pos: [0.55, 0.33, 0] })))

model("wood_step",
  box(1.30, 0.22, 0.90, { mat: "woodD", bevel: 0.03 }),
  box(1.00, 0.22, 0.90, { mat: "wood", bevel: 0.03, pos: [0, 0.22, 0] }),
  box(0.70, 0.22, 0.90, { mat: "woodL", bevel: 0.03, pos: [0, 0.44, 0] }),
  sym("x", cyl(0.05, 0.05, { mat: "gold", sides: 8, pos: [0.27, 0.67, 0.30] })))

model("pip_dice",
  box(0.8, 0.8, 0.8, { mat: "ivory", bevel: 0.06 }),
  // three pips on the top face
  sphere(0.07, { mat: "dot", detail: 0, pos: [-0.22, 0.80, -0.22] }),
  sphere(0.07, { mat: "dot", detail: 0, pos: [0, 0.80, 0] }),
  sphere(0.07, { mat: "dot", detail: 0, pos: [0.22, 0.80, 0.22] }),
  // four pips on the front face — count differs from top, so not colour-only
  sphere(0.07, { mat: "dot", detail: 0, pos: [-0.22, 0.58, 0.42] }),
  sphere(0.07, { mat: "dot", detail: 0, pos: [0.22, 0.58, 0.42] }),
  sphere(0.07, { mat: "dot", detail: 0, pos: [-0.22, 0.22, 0.42] }),
  sphere(0.07, { mat: "dot", detail: 0, pos: [0.22, 0.22, 0.42] }))

model("yarn_block",
  box(0.9, 0.9, 0.9, { mat: "yarn", bevel: 0.09 }),
  box(0.94, 0.05, 0.94, { mat: "yarnL", pos: [0, 0.28, 0] }),
  box(0.94, 0.05, 0.94, { mat: "yarnL", pos: [0, 0.60, 0] }),
  box(0.05, 0.94, 0.94, { mat: "yarnD", pos: [0.25, 0, 0] }),
  sphere(0.12, { mat: "yarnL", detail: 1, pos: [0.48, 0.92, 0.40] }))

model("flag_pedestal",
  cyl(0.42, 0.14, { mat: "stone", sides: 10, bevel: 0.03 }),
  cyl(0.09, 1.50, { mat: "pole", sides: 8, pos: [0, 0.14, 0] }),
  sphere(0.12, { mat: "gold", detail: 1, pos: [0, 1.66, 0] }),
  extrude([0, 0, 0.75, 0, 0.55, -0.28, 0, -0.28], 0.04,
    { mat: "flag", pos: [0.09, 1.15, 0] }),
  box(0.55, 0.04, 0.05, { mat: "gold", pos: [0.36, 1.22, 0.03] }))

model("path_tile",
  box(1.40, 0.12, 1.40, { mat: "stone", bevel: 0.03 }),
  box(1.10, 0.03, 1.10, { mat: "stoneD", pos: [0, 0.13, 0] }),
  box(0.90, 0.02, 0.90, { mat: "stoneL", pos: [0, 0.16, 0] }),
  sym("x", sym("z", cyl(0.06, 0.03, { mat: "gold", sides: 8, pos: [0.52, 0.17, 0.52] }))))
