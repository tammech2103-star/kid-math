// @skill chirp
// @asset-pipeline 21 lessons — one bright, friendly bank + short loop.
// @gameIds mario-bros,mario-odyssey,donkey-kong-country,pokemon,zelda,animal-crossing,mario-party,dr-mario,mario-maker,mario-paint,yoshi-island,luigis-mansion,brain-age,mario-and-luigi,pikmin,kirby,warioware,super-smash-bros,fire-emblem,splatoon,mario-kart
// @lessonIds intro,b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12,b13,b14,b15,b16,b17,b18,b19,b20
// @original original character, no existing franchise character, no logo, no copyright
// @consume Asset/v2/chirp/sfx/<name>.wav, Asset/v2/chirp/music/<name>.wav, Asset/v2/chirp/bank/*

// @asset coin
// @gameId mario-bros
// @lessonId intro
// @style pixel-art
// @consume Asset/v2/chirp/sfx/coin.wav
// @asset tap
// @gameId mario-party
// @lessonId b6
// @style plastic-bricks
// @consume Asset/v2/chirp/sfx/tap.wav
// @asset correct
// @gameId pokemon
// @lessonId b3
// @style paper-cut
// @consume Asset/v2/chirp/sfx/correct.wav
// @asset wrong
// @gameId luigis-mansion
// @lessonId b11
// @style ink-wash
// @consume Asset/v2/chirp/sfx/wrong.wav
// @asset star
// @gameId zelda
// @lessonId b4
// @style wax-crayon
// @consume Asset/v2/chirp/sfx/star.wav
// @asset whoosh
// @gameId mario-odyssey
// @lessonId b1
// @style watercolor
// @consume Asset/v2/chirp/sfx/whoosh.wav
// @asset pop
// @gameId animal-crossing
// @lessonId b5
// @style felt-fabric
// @consume Asset/v2/chirp/sfx/pop.wav
// @asset background_loop
// @gameId mario-kart
// @lessonId b20
// @style patchwork
// @consume Asset/v2/chirp/music/background_loop.wav

// Pitch carries meaning: up = reward, down = retry. No vocals, no samples.
sfx("coin", { vol: 0.34 },
  tone({ wave: "square", freq: "B5", dur: 0.05, duty: 0.25, env: [0.002, 0.02, 0.55, 0.03] }),
  at(0.05, tone({ wave: "square", freq: "E6", dur: 0.16, duty: 0.25, env: [0.002, 0.05, 0.45, 0.14] })))

sfx("tap", { vol: 0.36 },
  tone({ wave: "sine", freq: 880, to: 660, slide: 0.03, dur: 0.035, env: [0.001, 0.008, 0.4, 0.02] }),
  noise({ color: "white", dur: 0.018, vol: 0.18, env: [0.001, 0.006, 0.3, 0.01] }))

sfx("correct", { vol: 0.30 },
  tone({ wave: "triangle", freq: "C5", dur: 0.09, env: [0.003, 0.03, 0.5, 0.05] }),
  at(0.08, tone({ wave: "triangle", freq: "E5", dur: 0.09, env: [0.003, 0.03, 0.5, 0.05] })),
  at(0.16, tone({ wave: "triangle", freq: "G5", dur: 0.10, env: [0.003, 0.04, 0.5, 0.06] })),
  at(0.24, tone({ wave: "triangle", freq: "C6", dur: 0.20, env: [0.003, 0.06, 0.4, 0.16] })))

sfx("wrong", { vol: 0.32 },
  tone({ wave: "triangle", freq: 330, to: 190, slide: 0.22, dur: 0.24, env: [0.004, 0.05, 0.5, 0.12] }),
  at(0.03, tone({ wave: "sine", freq: 220, to: 130, slide: 0.20, dur: 0.20, vol: 0.5 })))

sfx("star", { vol: 0.30 },
  tone({ wave: "fm", fm: { ratio: 2.5, index: 1.5, decay: 0.5 }, freq: "C6", dur: 0.10, env: [0.002, 0.04, 0.4, 0.08] }),
  at(0.08, tone({ wave: "fm", fm: { ratio: 2.5, index: 1.5, decay: 0.5 }, freq: "E6", dur: 0.10, env: [0.002, 0.04, 0.4, 0.08] })),
  at(0.16, tone({ wave: "fm", fm: { ratio: 2.5, index: 1.5, decay: 0.5 }, freq: "G6", dur: 0.12, env: [0.002, 0.05, 0.4, 0.10] })),
  at(0.26, tone({ wave: "fm", fm: { ratio: 2.5, index: 1.5, decay: 0.7 }, freq: "C7", dur: 0.28, env: [0.002, 0.08, 0.35, 0.22] })))

sfx("whoosh", { vol: 0.59 },
  noise({ color: "pink", dur: 0.34, env: [0.03, 0.10, 0.55, 0.18], filter: { type: "lp", from: 3200, to: 500 } }),
  tone({ wave: "sine", freq: 420, to: 180, slide: 0.28, dur: 0.28, vol: 0.25 }))

sfx("pop", { vol: 0.36 },
  tone({ wave: "sine", freq: 260, to: 760, slide: 0.06, dur: 0.08, env: [0.001, 0.02, 0.35, 0.04] }),
  at(0.06, tone({ wave: "sine", freq: 980, dur: 0.05, env: [0.001, 0.01, 0.3, 0.05], vol: 0.5 })))

inst("lead", { wave: "square", duty: 0.25, env: [0.004, 0.08, 0.5, 0.06], vol: 0.16 })
inst("bass", { wave: "triangle", env: [0.004, 0.06, 0.7, 0.05], vol: 0.22 })
inst("bell", { wave: "fm", fm: { ratio: 2.5, index: 1.5, decay: 0.5 }, env: [0.002, 0.12, 0.4, 0.18], vol: 0.14 })

song("background_loop", { bpm: 150, vol: 0.62, fx: [limiter({ ceiling: 0.4 })] },
  track("lead", "C5 . . . E5 . . . G5 . . . E5 . . . | D5 . . . F5 . . . A5 . . . F5 . . ."),
  track("bass", "C3 . . . . . . . G2 . . . . . . . | F2 . . . . . . . G2 . . . . . . ."),
  track("bell", "C6 - - - - - - - | A5 - - - - - - -"),
  track("kick", "x . . . x . . . x . . . x . . . | x . . . x . . . x . . . x . . ."),
  track("hat", ". x . x . x . x . x . x . x . x | . x . x . x . x . x . x . x . x"))

bank("game_sfx", ["coin", "tap", "correct", "wrong", "star", "whoosh", "pop"])
