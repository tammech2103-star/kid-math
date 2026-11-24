// @skill vex
// @asset school-reward
// @purpose Ảnh phần thưởng cho bộ sưu tập 21 mảnh ghép (7 cột × 3 hàng), thay McQueen.
// @original original scene, no existing franchise character, no logo, no copyright.
// Không có xe đua / nhân vật bản quyền. Chủ đề: "đường tới trường".
// @consume Asset/v2/vex/school-reward.svg
// @note canvas 1200×900 (4:3). Lưới 7×3 → mỗi ô 171.4×300 (aspect-ratio 0.571).
//       Nếu runtime dùng CSS aspect-ratio cũ 0.898 (ảnh 1000×477), cần cập nhật
//       .puzzle-piece thành 0.571 khi đổi nguồn ảnh sang asset này.

pal({
  ink: "#3D2B52",
  sky0: "#7ED0FF", sky1: "#E8F8FF",
  sun: "#FFD84D", sun2: "#FFA63D",
  cloud: "#FFFFFF", cloudS: "#BBDDF2",
  hill: "#B8E986", hill2: "#8ED168",
  grass: "#7ED957", grass2: "#57B84D",
  wall: "#FFE3A8", wall2: "#F7C97B",
  roof: "#F2685D", roof2: "#C94A48",
  wood: "#9B6240", wood2: "#6E432B",
  win: "#BDEBFF", win2: "#7FC8EE",
  door: "#B26B3F", door2: "#8A4F2E",
  sand: "#F6D6A8", sand2: "#E7B77E",
  leaf: "#57C84D", leaf2: "#2E9E4F", leaf3: "#8FE06B",
  pink: "#FF8FB1", white: "#FFFFFF",
  petalY: "#FFE066", blue: "#5AB4E8",
  purple: "#A57BE0", mint: "#5FD6C0"
})

const O = (c, sw = 5) => ({ fill: c, stroke: "ink", sw: sw, join: "round" })
const S = (c, sw = 5) => ({ stroke: c, sw: sw, cap: "round", join: "round" })

/* ----------------------------------------------------------- sky details */

function cloud(x, y, s) {
  return tf({ x: x, y: y, scale: s },
    blob([0, 34, 4, 22, 14, 12, 28, 10, 38, 0, 54, 2, 66, 12, 78, 18, 84, 34],
      { fill: "cloud", stroke: "cloudS", sw: 4, smooth: 0.9 }),
    curve([12, 27, 24, 19, 40, 18], S("white", 4)))
}

function bird(x, y, s) {
  return tf({ x: x, y: y, scale: s },
    curve([0, 8, 10, 0, 20, 8], S("ink", 4)),
    curve([20, 8, 30, 0, 40, 8], S("ink", 4)))
}

function bunting() {
  const out = [curve([300, 52, 620, 70, 940, 62, 1200, 84], S("ink", 4))]
  const colors = ["roof", "petalY", "blue", "leaf", "purple", "pink"]
  for (let i = 0; i < 16; i++) {
    const t = i / 15
    const x = 310 + t * 880
    const y = 54 + t * 28 + Math.sin(t * Math.PI) * 6
    out.push(poly([x - 13, y, x + 13, y, x, y + 34], O(colors[i % colors.length], 3)))
  }
  return out
}

function rainbow() {
  const bands = [
    [190, "roof", 13], [171, "sun2", 13], [152, "petalY", 13], [133, "leaf3", 13]
  ]
  return bands.map(function (b) {
    return arc(1060, 330, b[0], 230, 490, S(b[1], b[2]))
  })
}

function sun() {
  return [
    radial(12, 150, 120, poly([142, 52, 158, 52, 150, 10], { fill: "sun2" })),
    circle(150, 120, 62, { fill: rad(["sun", "sun2"], { cx: 0.35, cy: 0.3 }), stroke: "ink", sw: 6 }),
    circle(131, 112, 5, "ink"), circle(169, 112, 5, "ink"),
    arc(150, 122, 28, 120, 240, S("ink", 5)),
    circle(120, 128, 7, { fill: "#FF9A8B", opacity: 0.7 }),
    circle(180, 128, 7, { fill: "#FF9A8B", opacity: 0.7 })
  ]
}

/* ------------------------------------------------------- reusable pieces */

sprite("_flower", { w: 30, h: 36 },
  line([15, 36, 15, 21], S("leaf2", 4)),
  ellipse(8, 27, 7, 4, { fill: "leaf", stroke: "ink", sw: 2 }),
  radial(5, 15, 14, ellipse(15, 5, 6, 7, O("pink", 2))),
  circle(15, 14, 6, O("petalY", 2)))

sprite("_butterfly", { w: 34, h: 30 },
  ellipse(10, 10, 9, 11, O("purple", 2)),
  ellipse(24, 10, 9, 11, O("mint", 2)),
  circle(9, 9, 3, "petalY"), circle(25, 9, 3, "petalY"),
  line([17, 5, 17, 24], S("ink", 3)),
  curve([17, 9, 11, 2, 8, 7], S("ink", 2)),
  curve([17, 9, 23, 2, 26, 7], S("ink", 2)))

/* ------------------------------------------------------------ the school */

function schoolWindow(x, y) {
  return [
    rect(x - 52, y - 58, 104, 116, O("win", 5)),
    line([x, y - 58, x, y + 58], S("ink", 4)),
    line([x - 52, y, x + 52, y], S("ink", 4)),
    rect(x - 40, y - 46, 22, 32, { fill: "white", opacity: 0.6, r: 5 }),
    rect(x - 60, y + 58, 120, 12, O("wall2", 4))
  ]
}

function school() {
  return [
    // thân trường + mái
    rect(205, 365, 790, 235, O("wall", 6)),
    rect(205, 365, 790, 22, { fill: "wall2", opacity: 0.65 }),
    rect(880, 262, 42, 88, O("roof2", 5)),           // ống khói (vẽ trước mái)
    poly([160, 370, 600, 240, 1040, 370], O("roof", 6)),
    line([160, 370, 1040, 370], S("roof2", 12)),
    line([600, 246, 600, 366], S("roof2", 4)),
    // tháp đồng hồ
    rect(535, 165, 130, 108, O("wall", 6)),
    poly([519, 170, 600, 110, 681, 170], O("roof", 6)),
    line([600, 110, 600, 64], S("ink", 6)),
    poly([600, 66, 660, 82, 600, 100], O("sun", 5)),
    circle(600, 218, 36, O("white", 5)),
    circle(600, 218, 28, { fill: "sky1", stroke: "ink", sw: 3 }),
    line([600, 218, 600, 198], S("ink", 4)),
    line([600, 218, 614, 226], S("ink", 4)),
    circle(600, 218, 4, "ink"),
    // biểu tượng sách + sao trên tường (không chữ, không logo)
    circle(600, 396, 33, O("blue", 5)),
    line([600, 385, 600, 408], S("white", 4)),
    line([582, 391, 594, 391], S("white", 4)),
    line([606, 391, 618, 391], S("white", 4)),
    star(600, 368, 5, 10, 5, O("petalY", 2)),
    // cửa sổ
    schoolWindow(325, 470), schoolWindow(475, 470),
    schoolWindow(725, 470), schoolWindow(875, 470),
    // cửa chính hình vòm
    path("M545 600 L545 512 A55 55 0 0 1 655 512 L655 600 Z", O("door", 6)),
    line([600, 458, 600, 600], S("door2", 4)),
    circle(628, 548, 6, O("petalY", 3)),
    rect(528, 600, 144, 16, O("sand2", 5)),
    rect(508, 616, 184, 14, O("sand", 5))
  ]
}

function tree(x, ground, s) {
  return tf({ x: x, y: ground, scale: s },
    rect(-17, -170, 34, 170, { fill: "wood", stroke: "ink", sw: 5, r: 8 }),
    line([-2, -120, -48, -186], S("wood", 11)),
    line([2, -135, 46, -198], S("wood", 11)),
    circle(-52, -196, 62, O("leaf2", 6)),
    circle(52, -202, 64, O("leaf", 6)),
    circle(0, -236, 74, O("leaf3", 6)),
    circle(-78, -226, 34, O("leaf", 5)),
    circle(76, -242, 36, O("leaf2", 5)),
    circle(-62, -214, 9, O("roof", 3)),
    circle(34, -250, 9, O("roof", 3)),
    circle(58, -178, 9, O("roof", 3)),
    curve([-40, -262, -18, -276, 2, -272], S("white", 5))
  )
}

function bushes() {
  return [
    tf({ x: 258, y: 742 },
      circle(-38, 0, 42, O("leaf2", 5)),
      circle(0, -16, 52, O("leaf", 5)),
      circle(42, 0, 42, O("leaf3", 5)),
      circle(-6, -24, 8, O("pink", 3))),
    tf({ x: 940, y: 760 },
      circle(-40, 0, 44, O("leaf", 5)),
      circle(2, -18, 54, O("leaf3", 5)),
      circle(44, 2, 40, O("leaf2", 5)),
      circle(14, -28, 8, O("petalY", 3)))
  ]
}

/* ------------------------------------------------------------- the scene */

scene("school-reward", { w: 1200, h: 900, bg: lin(["sky0", "sky1"], 90) },
  // nền xa
  blob([0, 330, 150, 280, 320, 322, 520, 268, 720, 318, 920, 272, 1200, 324, 1200, 620, 0, 620],
    { fill: "hill", smooth: 0.7 }),
  blob([0, 392, 210, 346, 430, 390, 660, 344, 900, 392, 1200, 352, 1200, 620, 0, 620],
    { fill: "hill2", smooth: 0.7 }),
  // cầu vồng, mây, chim, dây cờ, mặt trời
  rainbow(),
  cloud(350, 88, 0.95), cloud(650, 142, 0.75),
  cloud(870, 66, 0.65), cloud(1080, 176, 0.7),
  bird(412, 210, 0.9), bird(452, 226, 0.7), bird(770, 190, 0.8),
  bunting(),
  sun(),
  // sân cỏ
  rect(0, 600, 1200, 300, O("grass", 0)),
  rect(0, 600, 1200, 30, { fill: "grass2" }),
  blob([0, 636, 220, 612, 460, 638, 700, 610, 940, 640, 1200, 612, 1200, 900, 0, 900],
    { fill: "grass", smooth: 0.6 }),
  // đường lát gạch dẫn tới cửa trường
  poly([548, 600, 652, 600, 830, 900, 370, 900], O("sand", 6)),
  clip(poly([548, 600, 652, 600, 830, 900, 370, 900], { fill: "sand" }),
    (function () {
      const rows = [645, 695, 750, 812, 880]
      const edges = [600].concat(rows).concat([900])
      const lines = []
      for (let i = 0; i < rows.length; i++) {
        lines.push(line([260, rows[i], 940, rows[i]], S("sand2", 6)))
      }
      for (let i = 0; i < edges.length - 1; i++) {
        const y0 = edges[i], y1 = edges[i + 1]
        const offset = (i % 2) ? 45 : 0
        for (let x = 280 + offset; x < 930; x += 95) {
          lines.push(line([x - 4, y0, x + 4, y1], S("sand2", 5)))
        }
      }
      return lines
    })()),
  // ngôi trường
  school(),
  // cây hai bên
  tree(112, 706, 1), tree(1092, 724, 0.96),
  bushes(),
  // cỏ, hoa, bướm — mỗi ô trong lưới 7×3 đều có chi tiết
  (function () {
    const tufts = []
    const spots = [26, 74, 190, 232, 296, 340, 900, 962, 1010, 1064, 1160,
                   60, 150, 300, 930, 1040, 1150, 220, 980]
    for (let i = 0; i < spots.length; i++) {
      const x = spots[i]
      const y = 700 + (i % 4) * 48
      tufts.push(line([x, y, x - 8, y - 20], S("grass2", 5)))
      tufts.push(line([x, y, x + 8, y - 18], S("grass2", 5)))
    }
    return tufts
  })(),
  (function () {
    const f = []
    const spots = [[46, 806], [210, 850], [318, 790], [420, 742], [790, 754],
                   [886, 812], [1012, 860], [1152, 806], [70, 660], [1130, 668]]
    for (let i = 0; i < spots.length; i++) {
      f.push(stamp("_flower", spots[i][0], spots[i][1], {
        scale: 0.7 + (i % 3) * 0.12,
        swap: { pink: ["white", "purple", "pink"][i % 3] }
      }))
    }
    f.push(stamp("_butterfly", 352, 676, { scale: 0.9 }))
    f.push(stamp("_butterfly", 848, 730, { scale: 0.8, flip: "x" }))
    return f
  })()
)
