import AppKit
import CoreImage
import Vision

// usage: trace <photo> <outdir> <levels> <crops> [engraving-crop]
// e.g.   trace photo.png out 0.10,0.17,0.45 "waist-up:335,172,236,370,3.6,6.2"
let args = CommandLine.arguments
let ctx = CIContext(options: [.workingColorSpace: NSNull()])
let src = CIImage(contentsOf: URL(fileURLWithPath: args[1]))!
let W = src.extent.width, H = src.extent.height

// Person mask, so the backdrop's crests don't get traced.
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
try VNImageRequestHandler(ciImage: src).perform([req])
var mask = CIImage(cvPixelBuffer: req.results!.first!.pixelBuffer)
mask = mask.transformed(by: CGAffineTransform(scaleX: W / mask.extent.width, y: H / mask.extent.height))

func filter(_ name: String, _ img: CIImage, _ p: [String: Any] = [:]) -> CIImage {
  var q = p; q[kCIInputImageKey] = img
  return CIFilter(name: name, parameters: q)!.outputImage!
}
func crop(_ img: CIImage, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat, to width: CGFloat) -> CIImage {
  let r = CGRect(x: x, y: H - y - h, width: w, height: h)
  let c = img.clampedToExtent().cropped(to: r).transformed(by: CGAffineTransform(translationX: -r.minX, y: -r.minY))
  let s = width / w
  return filter("CILanczosScaleTransform", c, [kCIInputScaleKey: s, kCIInputAspectRatioKey: 1.0])
    .cropped(to: CGRect(x: 0, y: 0, width: (w * s).rounded(), height: (h * s).rounded()))
}

struct Plane { var w: Int; var h: Int; var v: [Float] }
// top-down luminance plane
func plane(_ img: CIImage) -> Plane {
  let w = Int(img.extent.width), h = Int(img.extent.height)
  var buf = [UInt8](repeating: 0, count: w * h * 4)
  ctx.render(img, toBitmap: &buf, rowBytes: w * 4, bounds: img.extent, format: .RGBA8, colorSpace: nil)
  var v = [Float](repeating: 0, count: w * h)
  for i in 0..<(w * h) { v[i] = (0.299 * Float(buf[i*4]) + 0.587 * Float(buf[i*4+1]) + 0.114 * Float(buf[i*4+2])) / 255 }
  return Plane(w: w, h: h, v: v)
}
func blur(_ p: Plane, _ sigma: Float) -> Plane {
  let r = max(1, Int((sigma * 3).rounded(.up)))
  var k = (-r...r).map { exp(-Float($0 * $0) / (2 * sigma * sigma)) }
  let sum = k.reduce(0, +); k = k.map { $0 / sum }
  var tmp = p.v, out = p.v
  for y in 0..<p.h { for x in 0..<p.w {
    var a: Float = 0
    for i in -r...r { a += k[i + r] * p.v[y * p.w + min(max(x + i, 0), p.w - 1)] }
    tmp[y * p.w + x] = a
  } }
  for y in 0..<p.h { for x in 0..<p.w {
    var a: Float = 0
    for i in -r...r { a += k[i + r] * tmp[min(max(y + i, 0), p.h - 1) * p.w + x] }
    out[y * p.w + x] = a
  } }
  return Plane(w: p.w, h: p.h, v: out)
}
func smooth(_ a: Float, _ b: Float, _ x: Float) -> Float {
  let t = min(max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t)
}
// alpha plane -> white ink PNG, plus a preview on card violet
func save(_ a: Plane, _ name: String) {
  for (suffix, bg) in [("", nil as (UInt8, UInt8, UInt8)?), ("-preview", (67, 40, 70))] {
    var px = [UInt8](repeating: 0, count: a.w * a.h * 4)
    for i in 0..<(a.w * a.h) {
      let al = min(max(a.v[i], 0), 1)
      if let bg = bg {
        px[i*4] = UInt8(Float(bg.0) + (255 - Float(bg.0)) * al); px[i*4+1] = UInt8(Float(bg.1) + (255 - Float(bg.1)) * al)
        px[i*4+2] = UInt8(Float(bg.2) + (255 - Float(bg.2)) * al); px[i*4+3] = 255
      } else {
        let c = UInt8(al * 255); px[i*4] = c; px[i*4+1] = c; px[i*4+2] = c; px[i*4+3] = c  // premultiplied white
      }
    }
    let cg = CGContext(data: &px, width: a.w, height: a.h, bitsPerComponent: 8, bytesPerRow: a.w * 4,
                       space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!.makeImage()!
    try! NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!
      .write(to: URL(fileURLWithPath: "\(args[2])/\(name)\(suffix).png"))
  }
}

// Lines: contours of constant tone. Wherever the smoothed photo crosses one of
// `levels`, a line of even weight is laid along the crossing, so hair, brows,
// eyes and beard come out as closed outlines. The figure's own contour is
// added so pale skin against the pale wall still gets an edge.
func lines(_ lum: Plane, _ m: Plane, sigma: Float, levels: [Float], weight: Float) -> Plane {
  let b = blur(lum, sigma), mb = blur(m, 2.0)
  // Strokes: a difference of Gaussians picks out what is darker than its
  // surroundings at pen scale (brows, lash lines, nostrils, the mouth, the dark
  // side of an edge), which is where a hand would put a line.
  let g1 = STROKE.isEmpty ? b : blur(lum, STROKE[0] * strokeScale), g2 = STROKE.isEmpty ? b : blur(lum, STROKE[0] * strokeScale * STROKE[1])
  var out = lum
  for y in 0..<lum.h { for x in 0..<lum.w {
    let i = y * lum.w + x
    let xl = max(x - 1, 0), xr = min(x + 1, lum.w - 1), yu = max(y - 1, 0), yd = min(y + 1, lum.h - 1)
    let gx = (b.v[y * lum.w + xr] - b.v[y * lum.w + xl]) / 2, gy = (b.v[yd * lum.w + x] - b.v[yu * lum.w + x]) / 2
    let grad = (gx * gx + gy * gy).squareRoot()
    var a: Float = 0
    for l in levels {
      // distance to the crossing, in px; faded out where the tone is too flat to trust
      let d = abs(b.v[i] - l) / max(grad, 1e-5)
      a = max(a, (1 - smooth(weight * 0.5, weight * 0.5 + 1.2, d)) * smooth(0.0012, 0.004, grad))
    }
    // finer lines at the face's own tones, so its modelling shows
    for l in faceLevels {
      let d = abs(b.v[i] - l) / max(grad, 1e-5)
      a = max(a, (1 - smooth(FACE_WEIGHT * 0.5, FACE_WEIGHT * 0.5 + 1.0, d)) * smooth(0.0008, 0.003, grad) * inFace(x, y))
    }
    // Tone lines inside the face ring the dark features in ink; on light ink
    // that reads backwards, so the shading alone carries the face there.
    if LIGHT || FACE_PLAIN { a *= 1 - inFace(x, y) }
    // On light ink the strokes are not drawn: they are cut out of the shading
    // instead, so brows, eyes and beard stay the dark of the card.
    var cut: Float = 0
    if !STROKE.isEmpty {
      var st = smooth(STROKE[2], STROKE[3], g2.v[i] - g1.v[i])
      if let hw = HOLLOW {
        // Outline the stroke instead of filling it: a solid light brow reads as
        // a negative in light ink, its outline reads the same in any ink.
        func dog(_ xx: Int, _ yy: Int) -> Float { g2.v[yy * lum.w + xx] - g1.v[yy * lum.w + xx] }
        let dgx = (dog(xr, y) - dog(xl, y)) / 2, dgy = (dog(x, yd) - dog(x, yu)) / 2
        let dd = abs(dog(x, y) - (STROKE[2] + STROKE[3]) / 2) / max((dgx * dgx + dgy * dgy).squareRoot(), 1e-6)
        st = 1 - smooth(hw * 0.5, hw * 0.5 + 1.0, dd)
      }
      st *= STROKE.count > 4 ? 1 : inFace(x, y)
      if LIGHT { cut = st } else { a = max(a, st) }
    }
    let mgx = (mb.v[y * lum.w + xr] - mb.v[y * lum.w + xl]) / 2, mgy = (mb.v[yd * lum.w + x] - mb.v[yu * lum.w + x]) / 2
    let md = abs(mb.v[i] - 0.5) / max((mgx * mgx + mgy * mgy).squareRoot(), 1e-5)
    let contour = 1 - smooth(weight * 0.5, weight * 0.5 + 1.2, md)
    // let lines run off the crop instead of ending on its border
    let border = Float(min(x, y, lum.w - 1 - x, lum.h - 1 - y))
    out.v[i] = max(a * smooth(0.4, 0.6, mb.v[i]), contour, shade(b, mb, x, y) * (1 - cut)) * smooth(4, 40, border)
  } }
  return out
}

// Shading: a diagonal hatch over the lit side of the face, the way a pen
// drawing models one. White ink is light, so the hatch thickens with brightness
// and stops in the shadows (sockets, beard, under the nose). It is kept to the
// face, found with Vision, so the clothes stay plain line.
// HATCH="period,angle,duty,lo,hi,gamma[,1]": px, degrees, widest line as a share
// of the period, then the tone range as percentiles of the face; a seventh
// value shades the whole figure. LIGHT=1 makes the drawing for light ink on a
// dark card, where ink has to mean light: shading on, dark strokes cut out.
// ELLIPSE="rx,ry,dy": the face ellipse as shares of Vision's box
let ELLIPSE: [Float] = ProcessInfo.processInfo.environment["ELLIPSE"].map { $0.split(separator: ",").map { Float($0)! } } ?? [0.6, 0.74, -0.04]
// HOLLOW=weight draws the strokes as outlines of that weight (for light ink)
let HOLLOW: Float? = ProcessInfo.processInfo.environment["HOLLOW"].flatMap { Float($0) }
// FACE_PLAIN=1 leaves the tone lines out of the face, so only strokes draw it
let FACE_PLAIN = ProcessInfo.processInfo.environment["FACE_PLAIN"] != nil
let LIGHT = ProcessInfo.processInfo.environment["LIGHT"] != nil
let HATCH: [Float]? = ProcessInfo.processInfo.environment["HATCH"].map { $0.split(separator: ",").map { Float($0)! } }
let faceReq = VNDetectFaceRectanglesRequest()
try VNImageRequestHandler(ciImage: src).perform([faceReq])
// native px, top-left origin
let FACE: CGRect? = faceReq.results?.max { $0.boundingBox.width < $1.boundingBox.width }.map {
  CGRect(x: $0.boundingBox.minX * W, y: (1 - $0.boundingBox.maxY) * H, width: $0.boundingBox.width * W, height: $0.boundingBox.height * H)
}
var faceIn: (cx: Float, cy: Float, rx: Float, ry: Float)?   // set per crop, output px
var toneRange: (Float, Float) = (0, 1)
// FACE="weight,p,p,p...": line weight, then the tone levels as percentiles of the face
let FACE_SPEC: [Float] = ProcessInfo.processInfo.environment["FACE"].map { $0.split(separator: ",").map { Float($0)! } } ?? []
let FACE_WEIGHT: Float = FACE_SPEC.first ?? 2
var faceLevels: [Float] = []
// STROKE="sigma,k,lo,hi[,1]": pen scale in photo px, ratio of the wider blur, the
// darkness range that fades a stroke in; a fifth value strokes the whole figure
var strokeScale: Float = 1   // photo px -> output px, set per crop
let STROKE: [Float] = ProcessInfo.processInfo.environment["STROKE"].map { $0.split(separator: ",").map { Float($0)! } } ?? []
func inFace(_ x: Int, _ y: Int) -> Float {
  guard let f = faceIn else { return 0 }
  let dx = (Float(x) - f.cx) / f.rx, dy = (Float(y) - f.cy) / f.ry
  return 1 - smooth(0.8, 1.0, (dx * dx + dy * dy).squareRoot())
}
func shade(_ tone: Plane, _ m: Plane, _ x: Int, _ y: Int) -> Float {
  guard let h = HATCH, faceIn != nil else { return 0 }
  let i = y * tone.w + x
  let t = pow(min(max((tone.v[i] - toneRange.0) / (toneRange.1 - toneRange.0), 0), 1), h[5])
  let rad = h[1] * .pi / 180
  let u = (Float(x) * cos(rad) + Float(y) * sin(rad)) / h[0]
  let d = abs((u - u.rounded(.down)) - 0.5) * 2
  // when kept to the face, anything brighter than its skin is clothing: leave it bare
  let skin: Float = h.count > 6 ? 1 : 1 - smooth(toneRange.1 + 0.02, toneRange.1 + 0.06, tone.v[i])
  let width = h[2] * t * skin, aa = 2.4 / h[0]
  return (1 - smooth(width - aa, width + aa, d)) * smooth(0.03, 0.12, width) * smooth(0.5, 0.8, m.v[i]) * (h.count > 6 ? 1 : inFace(x, y))
}

// Bars: a cell door drawn in front of the figure. Each bar is two lines with
// the drawing erased between them, so the figure reads as standing behind it;
// two rails cross the bars near the top and bottom.
// BARS="count,width,line,rail": bars across, bar width, line weight, rail height (px).
let BARS: [Float] = ProcessInfo.processInfo.environment["BARS"].map { $0.split(separator: ",").map { Float($0)! } } ?? []
func barred(_ p: Plane) -> Plane {
  guard BARS.count == 4 else { return p }
  var out = p
  let n = BARS[0], bw = BARS[1], lw = BARS[2], rh = BARS[3]
  // 1 on the outline of a band `half` wide, 0 inside it, nil outside
  func band(_ d: Float, _ half: Float) -> Float? {
    if d > half + lw * 0.5 + 0.6 { return nil }
    return 1 - smooth(lw * 0.5 - 0.6, lw * 0.5 + 0.6, abs(d - half))
  }
  let rails = [Float(p.h) * 0.045, Float(p.h) * 0.955]
  for y in 0..<p.h { for x in 0..<p.w {
    let i = y * p.w + x
    let pitch = Float(p.w) / n
    let dx = abs((Float(x) / pitch - (Float(x) / pitch).rounded(.down)) - 0.5) * pitch
    let inside = Float(y) > rails[0] && Float(y) < rails[1]
    if inside, let a = band(dx, bw * 0.5) { out.v[i] = a }
    for r in rails { if let a = band(abs(Float(y) - r), rh * 0.5) { out.v[i] = a } }
    if Float(y) < rails[0] - rh * 0.5 - lw || Float(y) > rails[1] + rh * 0.5 + lw { out.v[i] = 0 }
  } }
  return out
}

// name, crop in native px (x, y from top-left, w, h), smoothing in output px
let LEVELS: [Float] = CommandLine.arguments[3].split(separator: ",").map { Float($0)! }
// Crops come in as "name:x,y,w,h,sigma,weight[:level,level...]" joined by ";",
// in native px from the top-left. sigma is the smoothing and weight the line
// weight, both in output px; weight is picked so every drawing prints at about
// the same weight once fitted into the card's 228x290 window. A crop may
// override the tone levels.
struct Crop { var name: String; var x, y, w, h: CGFloat; var sigma, weight: Float; var levels: [Float]? }
let crops: [Crop] = CommandLine.arguments[4].split(separator: ";").map { spec in
  let parts = spec.split(separator: ":"), n = parts[1].split(separator: ",").map { Double($0)! }
  return Crop(name: String(parts[0]), x: n[0], y: n[1], w: n[2], h: n[3], sigma: Float(n[4]), weight: Float(n[5]),
              levels: parts.count > 2 ? parts[2].split(separator: ",").map { Float($0)! } : nil)
}
let engravingFrom = CommandLine.arguments.count > 5 ? CommandLine.arguments[5] : ""
let outW: CGFloat = 900
var portrait: (Plane, Plane)?
for c in crops {
  var g = filter("CIPhotoEffectMono", crop(src, x: c.x, y: c.y, w: c.w, h: c.h, to: outW))
  g = filter("CIGammaAdjust", g, ["inputPower": 0.8])
  let lum = plane(g), m = plane(crop(mask, x: c.x, y: c.y, w: c.w, h: c.h, to: outW))
  var onWhite = lum
  for i in 0..<lum.v.count { onWhite.v[i] = lum.v[i] * m.v[i] + (1 - m.v[i]) }
  let s = onWhite.v.enumerated().filter { m.v[$0.offset] > 0.9 }.map { $0.element }.sorted()
  print(c.name, "tone percentiles", [5, 20, 35, 50, 65, 80, 95].map { String(format: "%.2f", s[s.count * $0 / 100]) })
  strokeScale = Float(outW / c.w)
  if let f = FACE {
    let h: [Float] = HATCH ?? [0, 0, 0, 0, 100, 1]
    let k = Float(outW / c.w)
    // an ellipse a little larger than Vision's box: forehead to chin, ear to ear
    faceIn = (cx: (Float(f.midX) - Float(c.x)) * k, cy: (Float(f.midY) - Float(c.y)) * k + Float(f.height) * k * ELLIPSE[2],
              rx: Float(f.width) * k * ELLIPSE[0], ry: Float(f.height) * k * ELLIPSE[1])
    let b = blur(onWhite, c.sigma)
    var t: [Float] = []
    for y in 0..<b.h { for x in 0..<b.w where inFace(x, y) > 0.5 && m.v[y * b.w + x] > 0.9 { t.append(b.v[y * b.w + x]) } }
    t.sort()
    toneRange = (t[t.count * Int(h[3]) / 100], t[min(t.count - 1, t.count * Int(h[4]) / 100)])
    faceLevels = FACE_SPEC.dropFirst().map { t[min(t.count - 1, t.count * Int($0) / 100)] }
    print(c.name, "levels", faceLevels)
    print(c.name, "face", faceIn!, "tone", toneRange)
  }
  save(barred(lines(onWhite, m, sigma: c.sigma, levels: c.levels ?? LEVELS, weight: c.weight)), c.name)
  if c.name == engravingFrom { portrait = (lum, m) }
}

// Engraving: the portrait as a line screen, like a banknote. White ink is
// light, so line weight follows brightness and the dark jacket thins out.
if let (lum, m) = portrait {
  let tone = blur(lum, 2.5)
  var out = lum
  let period: Float = 15
  for y in 0..<lum.h { for x in 0..<lum.w {
    let i = y * lum.w + x
    let t = pow(min(max((tone.v[i] - 0.08) / 0.8, 0), 1), 0.85)
    // gentle wave so the screen reads as hand-cut rather than as scanlines
    let yy = Float(y) + 2.2 * sin(Float(x) / 46)
    let d = abs((yy / period - (yy / period).rounded(.down)) - 0.5) * 2   // 0 at line center
    let width = 0.06 + 0.86 * t
    out.v[i] = (1 - smooth(width - 0.14, width + 0.14, d)) * smooth(0.35, 0.65, m.v[i])
  } }
  save(out, "engraving")
}
print("ok")
