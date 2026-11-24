// @skill vex
// @asset-pipeline 21 lessons — one decorative vector icon per gameId.
// @gameIds mario-bros,mario-odyssey,donkey-kong-country,pokemon,zelda,animal-crossing,mario-party,dr-mario,mario-maker,mario-paint,yoshi-island,luigis-mansion,brain-age,mario-and-luigi,pikmin,kirby,warioware,super-smash-bros,fire-emblem,splatoon,mario-kart
// @lessonIds intro,b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12,b13,b14,b15,b16,b17,b18,b19,b20
// @original original character, no existing franchise character, no logo, no copyright
// @note gameId strings are internal keys only; no text, character, logo or badge is drawn.
// @consume Asset/v2/vex/<name>.svg

// @asset vex_coin_stamp
// @gameId mario-bros
// @lessonId intro
// @style pixel-art
// @palette sky=#5C94FC accent=#FFD84D ink=#3A2317
// @consume Asset/v2/vex/vex_coin_stamp.svg
// @asset vex_scarf_knot
// @gameId mario-odyssey
// @lessonId b1
// @style watercolor
// @palette sky=#8AD7FF accent=#FF7A59 ink=#243B5A
// @consume Asset/v2/vex/vex_scarf_knot.svg
// @asset vex_wood_rung
// @gameId donkey-kong-country
// @lessonId b2
// @style carved-wood
// @palette sky=#A8E06A accent=#FFB020 ink=#4A2C1A
// @consume Asset/v2/vex/vex_wood_rung.svg
// @asset vex_grid_net
// @gameId pokemon
// @lessonId b3
// @style paper-cut
// @palette sky=#DFF3A5 accent=#F05A5A ink=#2E4A1F
// @consume Asset/v2/vex/vex_grid_net.svg
// @asset vex_key_ring
// @gameId zelda
// @lessonId b4
// @style wax-crayon
// @palette sky=#9FD6A8 accent=#F2C94C ink=#23423A
// @consume Asset/v2/vex/vex_key_ring.svg
// @asset vex_flower_petals
// @gameId animal-crossing
// @lessonId b5
// @style felt-fabric
// @palette sky=#BFE9FF accent=#FF9BB3 ink=#3E5B46
// @consume Asset/v2/vex/vex_flower_petals.svg
// @asset vex_pip_die
// @gameId mario-party
// @lessonId b6
// @style plastic-bricks
// @palette sky=#FFD6F0 accent=#8E6CFF ink=#3B2A57
// @consume Asset/v2/vex/vex_pip_die.svg
// @asset vex_capsule_cross
// @gameId dr-mario
// @lessonId b7
// @style origami
// @palette sky=#EAF3FF accent=#FF5B6E ink=#2B3A66
// @consume Asset/v2/vex/vex_capsule_cross.svg
// @asset vex_clay_block
// @gameId mario-maker
// @lessonId b8
// @style clay
// @palette sky=#FCE3B4 accent=#FF7B54 ink=#4A3423
// @consume Asset/v2/vex/vex_clay_block.svg
// @asset vex_brush_swash
// @gameId mario-paint
// @lessonId b9
// @style oil-paint
// @palette sky=#FFF0F6 accent=#7ED957 ink=#3C3557
// @consume Asset/v2/vex/vex_brush_swash.svg
// @asset vex_mosaic_egg
// @gameId yoshi-island
// @lessonId b10
// @style mosaic
// @palette sky=#C9F0A0 accent=#FF8F3F ink=#35532E
// @consume Asset/v2/vex/vex_mosaic_egg.svg
// @asset vex_lantern_frame
// @gameId luigis-mansion
// @lessonId b11
// @style ink-wash
// @palette sky=#C8D2F2 accent=#7CE0C0 ink=#2E3352
// @consume Asset/v2/vex/vex_lantern_frame.svg
// @asset vex_chalk_board
// @gameId brain-age
// @lessonId b12
// @style chalkboard
// @palette sky=#FFE9A8 accent=#FF7F50 ink=#4A3B2C
// @consume Asset/v2/vex/vex_chalk_board.svg
// @asset vex_marker_card
// @gameId mario-and-luigi
// @lessonId b13
// @style grid-paper
// @palette sky=#BFE4FF accent=#FF6B5B ink=#2E4160
// @consume Asset/v2/vex/vex_marker_card.svg
// @asset vex_yarn_ball
// @gameId pikmin
// @lessonId b14
// @style yarn
// @palette sky=#D8F3A3 accent=#FF6F61 ink=#3B5230
// @consume Asset/v2/vex/vex_yarn_ball.svg
// @asset vex_puff_cloud
// @gameId kirby
// @lessonId b15
// @style cotton
// @palette sky=#FFD8EA accent=#FF6FA5 ink=#5B3A57
// @consume Asset/v2/vex/vex_puff_cloud.svg
// @asset vex_halftone_burst
// @gameId warioware
// @lessonId b16
// @style pop-art
// @palette sky=#FFE066 accent=#E34F3F ink=#3B2B22
// @consume Asset/v2/vex/vex_halftone_burst.svg
// @asset vex_flag_banner
// @gameId super-smash-bros
// @lessonId b17
// @style neon-vector
// @palette sky=#FFC94D accent=#E8453C ink=#3A2438
// @consume Asset/v2/vex/vex_flag_banner.svg
// @asset vex_wood_tile
// @gameId fire-emblem
// @lessonId b18
// @style woodcut
// @palette sky=#B7C7E8 accent=#E2B541 ink=#26324F
// @consume Asset/v2/vex/vex_wood_tile.svg
// @asset vex_stencil_drop
// @gameId splatoon
// @lessonId b19
// @style spray-paint
// @palette sky=#FFD1E8 accent=#FF4D8D ink=#3A2B4A
// @consume Asset/v2/vex/vex_stencil_drop.svg
// @asset vex_quilt_square
// @gameId mario-kart
// @lessonId b20
// @style patchwork
// @palette sky=#8DD9FF accent=#FFD84D ink=#243B5A
// @consume Asset/v2/vex/vex_quilt_square.svg

// One shared flat palette, thick silhouette outline, top-left light on every
// icon. Details use shape/pattern differences, never colour alone.
pal({
  k: "#2B2440", w: "#FFF8E7", y: "#FFD84D", o: "#FF9F43",
  r: "#F2695C", p: "#FF9BB3", g: "#7FD08A", b: "#8AD7FF",
  v: "#A88BFF", t: "#7CE0C0", n: "#B07A45", d: "#3E6B54"
})
const INK = { stroke: "k", sw: 2.4, fill: "none" }
const THIN = { stroke: "k", sw: 1.6, fill: "none" }

sprite("vex_coin_stamp", { w: 48, h: 48, outline: "k", ow: 2.4 },
  circle(24, 24, 17, "y"),
  circle(24, 24, 12, { fill: "none", stroke: "o", sw: 2.2 }),
  rect(21, 14, 6, 20, { fill: "o", r: 3 }),
  line([16, 24, 32, 24], THIN),
  circle(18, 18, 1.6, "w"), circle(30, 30, 1.6, "w"))

sprite("vex_scarf_knot", { w: 48, h: 48, outline: "k", ow: 2.4 },
  blob([6, 30, 14, 22, 22, 20, 27, 27, 19, 34, 10, 37], { fill: "b" }),
  blob([26, 16, 36, 12, 43, 19, 38, 28, 28, 26], { fill: "r" }),
  circle(25, 25, 7, "o"),
  line([12, 30, 19, 25], INK), line([31, 19, 38, 23], INK),
  line([28, 28, 35, 24], THIN))

sprite("vex_wood_rung", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(8, 5, 9, 38, { fill: "n", r: 3 }),
  rect(31, 5, 9, 38, { fill: "n", r: 3 }),
  rect(15, 12, 18, 7, { fill: "o", r: 2 }),
  rect(15, 29, 18, 7, { fill: "o", r: 2 }),
  line([11, 12, 14, 16, 11, 20], THIN),
  line([34, 28, 37, 32, 34, 36], THIN))

sprite("vex_grid_net", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(6, 6, 36, 36, { fill: "w", r: 5 }),
  line([18, 6, 18, 42], THIN), line([30, 6, 30, 42], THIN),
  line([6, 18, 42, 18], THIN), line([6, 30, 42, 30], THIN),
  circle(18, 18, 3, "r"), circle(30, 30, 3, "g"),
  rect(20, 20, 8, 8, { fill: "y", r: 2 }))

sprite("vex_key_ring", { w: 48, h: 48, outline: "k", ow: 2.4 },
  circle(18, 19, 11, { fill: "none", stroke: "y", sw: 4 }),
  poly([26, 27, 41, 41, 36, 41, 36, 36, 32, 36, 32, 32], "y"),
  circle(18, 19, 4, { fill: "w", stroke: "k", sw: 1.6 }),
  line([23, 24, 27, 28], INK), circle(39, 38, 1.6, "w"))

sprite("vex_flower_petals", { w: 48, h: 48, outline: "k", ow: 2.4 },
  circle(24, 14, 8, "p"), circle(14, 24, 8, "p"),
  circle(34, 24, 8, "p"), circle(24, 34, 8, "p"),
  circle(24, 24, 6, "y"),
  line([24, 39, 24, 45], INK),
  poly([24, 42, 16, 39, 20, 45], "g"))

sprite("vex_pip_die", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(7, 7, 34, 34, { fill: "v", r: 7 }),
  circle(17, 17, 3.4, "w"), circle(31, 31, 3.4, "w"),
  star(31, 17, 5, 4.2, 2, "y"),
  rect(14, 29, 8, 3, { fill: "w", r: 1.5 }))

sprite("vex_capsule_cross", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(6, 18, 36, 13, { fill: "r", r: 6.5 }),
  rect(18, 6, 13, 36, { fill: "b", r: 6.5 }),
  circle(24.5, 24.5, 6, "w"),
  line([21.5, 24.5, 27.5, 24.5], INK),
  line([24.5, 21.5, 24.5, 27.5], INK))

sprite("vex_clay_block", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(7, 9, 34, 30, { fill: "o", r: 4 }),
  poly([7, 9, 15, 9, 11, 14], "y"),
  poly([41, 39, 33, 39, 37, 34], "r"),
  circle(18, 22, 3, "w"), circle(30, 22, 3, "w"),
  line([18, 32, 24, 28, 30, 32], THIN))

sprite("vex_brush_swash", { w: 48, h: 48, outline: "k", ow: 2.4 },
  tf({ rot: -38, origin: [24, 24] },
    rect(20, 4, 8, 25, { fill: "n", r: 3 }),
    rect(19, 26, 10, 6, { fill: "k" }),
    blob([19, 31, 29, 31, 32, 40, 24, 44, 16, 40], { fill: "g" })),
  circle(9, 35, 3, "g"), circle(14, 41, 2, "g"))

sprite("vex_mosaic_egg", { w: 48, h: 48, outline: "k", ow: 2.4 },
  clip(blob([24, 5, 37, 16, 39, 32, 24, 44, 9, 32, 11, 16], { fill: "w" }),
    rect(8, 6, 32, 38, "y"),
    poly([8, 6, 24, 6, 16, 20], "o"),
    poly([24, 6, 40, 6, 32, 20], "r"),
    poly([8, 22, 24, 22, 16, 36], "g"),
    poly([24, 22, 40, 22, 32, 36], "b")),
  line([18, 16, 30, 16, 24, 26], THIN))

sprite("vex_lantern_frame", { w: 48, h: 48, outline: "k", ow: 2.4 },
  poly([10, 13, 38, 13, 34, 40, 14, 40], "t"),
  circle(24, 25, 9, { fill: "y", glow: { r: 6, color: "y" } }),
  line([18, 14, 18, 39], THIN), line([30, 14, 30, 39], THIN),
  rect(10, 8, 28, 5, { fill: "k", r: 2 }),
  line([24, 4, 24, 8], INK))

sprite("vex_chalk_board", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(6, 7, 36, 34, { fill: "n", r: 3 }),
  rect(10, 11, 28, 26, "d"),
  line([14, 18, 34, 18], { stroke: "w", sw: 2 }),
  line([14, 25, 29, 25], { stroke: "w", sw: 2 }),
  poly([16, 33, 22, 29, 28, 33], "o"),
  rect(20, 41, 8, 4, { fill: "w", r: 2 }))

sprite("vex_marker_card", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(7, 6, 34, 36, { fill: "w", r: 3 }),
  poly([31, 6, 41, 16, 31, 16], "b"),
  line([18, 6, 18, 42], THIN), line([29, 6, 29, 42], THIN),
  line([7, 18, 41, 18], THIN), line([7, 30, 41, 30], THIN),
  line([11, 21, 16, 27], INK), line([16, 21, 11, 27], INK))

sprite("vex_yarn_ball", { w: 48, h: 48, outline: "k", ow: 2.4 },
  circle(24, 27, 16, "r"),
  curve([10, 25, 22, 17, 37, 26], { stroke: "w", sw: 2.4, fill: "none" }),
  curve([12, 35, 25, 28, 38, 33], { stroke: "w", sw: 2.4, fill: "none" }),
  curve([18, 14, 26, 27, 22, 41], { stroke: "o", sw: 2, fill: "none" }),
  line([24, 11, 24, 6], INK),
  poly([24, 8, 32, 3, 30, 11], "g"))

sprite("vex_puff_cloud", { w: 48, h: 48, outline: "k", ow: 2.4 },
  circle(15, 21, 11, "p"), circle(31, 19, 12, "p"),
  circle(36, 29, 8, "p"), circle(12, 30, 9, "p"),
  rect(12, 27, 25, 10, "p"),
  circle(19, 20, 2.4, "w"), circle(30, 17, 2.4, "w"),
  line([20, 34, 28, 34], THIN))

sprite("vex_halftone_burst", { w: 48, h: 48, outline: "k", ow: 2.4 },
  star(24, 24, 10, 20, 12, "y"),
  circle(24, 24, 10, "r"),
  circle(24, 24, 5, "w"),
  circle(9, 12, 2, "k"), circle(39, 12, 2, "k"),
  circle(9, 36, 2, "k"), circle(39, 36, 2, "k"))

sprite("vex_flag_banner", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(11, 5, 5, 38, { fill: "n", r: 2 }),
  poly([16, 8, 42, 8, 36, 19, 42, 30, 16, 30], "r"),
  line([17, 14, 38, 14], { stroke: "w", sw: 2 }),
  star(26, 23, 5, 6, 3, "y"),
  circle(13.5, 4, 3, "y"))

sprite("vex_wood_tile", { w: 48, h: 48, outline: "k", ow: 2.4 },
  rect(7, 7, 34, 34, { fill: "n", r: 3 }),
  curve([10, 14, 22, 10, 38, 14], THIN),
  curve([10, 24, 24, 20, 38, 24], THIN),
  curve([10, 34, 22, 30, 38, 34], THIN),
  ngon(24, 24, 4, 8, "y"),
  circle(24, 24, 2.4, "k"))

sprite("vex_stencil_drop", { w: 48, h: 48, outline: "k", ow: 2.4 },
  blob([24, 5, 34, 20, 39, 30, 24, 42, 9, 30, 14, 20], { fill: "p" }),
  circle(24, 29, 8, { fill: "none", stroke: "w", sw: 2.4 }),
  circle(19, 20, 2, "w"), circle(29, 15, 1.6, "w"),
  line([24, 30, 24, 36], THIN))

sprite("vex_quilt_square", { w: 48, h: 48, outline: "k", ow: 2.4 },
  poly([24, 5, 43, 24, 24, 43, 5, 24], "b"),
  poly([24, 11, 37, 24, 24, 37, 11, 24], "y"),
  poly([24, 17, 31, 24, 24, 31, 17, 24], "r"),
  line([24, 6, 24, 13], THIN), line([42, 24, 35, 24], THIN),
  line([24, 42, 24, 35], THIN), line([6, 24, 13, 24], THIN))
