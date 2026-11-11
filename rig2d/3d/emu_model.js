// Cartoon emu model shared by the 3D pages (emu10, love10): built from real emu anatomy, our own design.
//   import { EmuKit } from './emu_model.js';  const { makeEmu, poseEmu, slouchHat } = EmuKit(THREE, { outlined, canvasTex, std, rr, pick });
export function EmuKit(THREE, { outlined, canvasTex, std, rr, pick }) {
// ---------- emus ----------
// Anatomy (cartoon, ours): shaggy double-plumed body that droops into a ragged skirt; long neck, feathered low and
// bare blue skin near the head; small dark-capped head, flat dark beak; big eyes with amber iris, blue-grey lids;
// thick feathered thighs, long grey scaly shanks with a backward ankle, three forward toes with claws.
const featherTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#6a5034'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const x = rr(0, w), y = rr(0, h), l = rr(18, 46); g.strokeStyle = pick(['#2a1a10', '#3a2a1a', '#8a6a44', '#a8885a', '#1a120a']); g.lineWidth = rr(1.5, 3.5); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + rr(-6, 6), y + l * 0.5, x + rr(-10, 10), y + l); g.stroke(); }
}, [2, 2]);
const neckTex = canvasTex(512, 64, (g, w, h) => {   // along the neck: feathered base -> blue bare skin
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#6a5034'); gr.addColorStop(0.45, '#6a5034'); gr.addColorStop(0.6, '#5a7ac8'); gr.addColorStop(1, '#4a6ab8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { const x = rr(0, w), y = rr(0, h); g.fillStyle = x < w * 0.55 ? pick(['#2a1a10', '#8a6a44']) : pick(['rgba(30,30,50,.6)', 'rgba(140,170,230,.6)']); g.fillRect(x, y, rr(4, 12) * (x < w * 0.55 ? 1 : 0.4), rr(1, 3)); }
});
const scaleTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#7a7a84'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a4a54'; g.lineWidth = 2; for (let y = 0; y < h; y += 10) { g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(w / 2, y + 6, w, y); g.stroke(); } });
const EMU_M = { feather: std('#ffffff', { map: featherTex, roughness: 1 }), neck: std('#ffffff', { map: neckTex, roughness: 0.8 }), head: std('#4a4a5e', { roughness: 0.8 }),
  beak: std('#3a3a40', { roughness: 0.4 }), leg: std('#ffffff', { map: scaleTex, roughness: 0.6 }), white: std('#e4e4e4', { roughness: 0.35 }), iris: std('#d8902a', { roughness: 0.3 }),
  pupil: std('#0a0a0a', { roughness: 0.1 }), lid: std('#5a6a90', { roughness: 0.6 }), claw: std('#2a2a2a') };
function makeEmu(hero) {
  const seg = hero ? 1 : 0.5, ink = hero ? undefined : false, root = new THREE.Group(), body = new THREE.Group(); body.position.y = 1.0; root.add(body);
  const add = (geo, mat, parent, o = {}) => outlined(new THREE.Mesh(geo, mat), parent, Object.assign({ ink: hero ? undefined : false }, o));
  const torso = add(new THREE.SphereGeometry(1, 24 * seg, 16 * seg), EMU_M.feather, body); torso.scale.set(0.32, 0.3, 0.52); body.rotation.order = 'YXZ';
  const skirtG = new THREE.CylinderGeometry(0.29, 0.33, 0.24, 28 * seg, 3, true); { const p = skirtG.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.1) p.setY(i, p.getY(i) - Math.abs(Math.sin(i * 1.7)) * 0.1); skirtG.computeVertexNormals(); }
  const skirt = add(skirtG, EMU_M.feather, body, { ink: false }); skirt.position.set(0, -0.1, -0.06); skirt.scale.set(1, 1, 1.5); skirt.material = EMU_M.feather.clone(); skirt.material.side = THREE.DoubleSide;
  const neckPivot = new THREE.Group(); neckPivot.position.set(0, 0.12, 0.3); body.add(neckPivot);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.25, 0.14), new THREE.Vector3(0, 0.55, 0.14), new THREE.Vector3(0, 0.74, 0.22)]);
  add(new THREE.TubeGeometry(curve, 20 * seg, 0.068, 10 * seg), EMU_M.neck, neckPivot);
  const head = new THREE.Group(); head.position.set(0, 0.78, 0.25); head.scale.setScalar(1.7); neckPivot.add(head);   // cartoon: big head so the face reads
  const skull = add(new THREE.SphereGeometry(0.085, 18 * seg, 12 * seg), EMU_M.head, head); skull.scale.set(0.9, 0.85, 1.1);
  const bg = new THREE.ConeGeometry(0.038, 0.13, 12); bg.rotateX(Math.PI / 2); bg.scale(1, 0.5, 1); const beak = add(bg, EMU_M.beak, head); beak.position.set(0, -0.015, 0.13);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.06, 0.02, 0.04); e.rotation.y = s * 0.55; head.add(e);
    add(new THREE.SphereGeometry(0.036, 16, 12), EMU_M.white, e, { ink: false });
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), EMU_M.iris); iris.position.z = 0.022; iris.scale.z = 0.5; e.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), EMU_M.pupil); pupil.position.z = 0.03; pupil.scale.z = 0.5; e.add(pupil);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 4), std('#ffffff', { emissive: '#ffffff' })); hl.position.set(0.008, 0.009, 0.036); e.add(hl);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.039, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), EMU_M.lid); lid.rotation.x = -1.6; e.add(lid);
    eyes.push({ e, lid, iris, pupil });
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.11, -0.12, 0.02); body.add(hip);
    const thigh = add(new THREE.SphereGeometry(0.1, 12 * seg, 8 * seg), EMU_M.feather, hip, { ink: false }); thigh.scale.set(0.8, 1.4, 1); thigh.position.y = -0.08;
    const knee = new THREE.Group(); knee.position.y = -0.2; hip.add(knee);
    const shank = add(new THREE.CylinderGeometry(0.03, 0.035, 0.38, 8), EMU_M.leg, knee); shank.position.y = -0.19;
    const ankle = new THREE.Group(); ankle.position.y = -0.38; knee.add(ankle);
    const tars = add(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 8), EMU_M.leg, ankle); tars.position.y = -0.2;
    const foot = new THREE.Group(); foot.position.y = -0.4; ankle.add(foot);
    for (const a of [-0.45, 0, 0.45]) { const toe = add(new THREE.CylinderGeometry(0.014, 0.02, 0.13, 6), EMU_M.leg, foot, { ink: false }); toe.rotation.set(Math.PI / 2, 0, 0); toe.position.set(Math.sin(a) * 0.06, 0, Math.cos(a) * 0.06); toe.rotation.z = -a; if (hero) { const cl = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 6), EMU_M.claw); cl.rotation.x = Math.PI / 2; cl.position.set(Math.sin(a) * 0.13, 0, Math.cos(a) * 0.13); foot.add(cl); } }
    legs.push({ hip, knee, ankle, foot });
  }
  root.userData = { body, neckPivot, head, eyes, legs, hat: null };
  return root;
}
// pose: speed 0 = standing (optionally grazing), >0 = running cycle; look: eye direction; lid 0 open .. 1 closed
function poseEmu(e, t, o = {}) {
  const u = e.userData, sp = o.speed || 0, ph = (o.phase || 0) + t * (sp > 0 ? 3.2 + sp * 0.12 : 0) * Math.PI * 2;
  for (let i = 0; i < 2; i++) {
    const L = u.legs[i], p = ph + i * Math.PI, sw = sp > 0 ? Math.sin(p) : 0, lift = sp > 0 ? Math.max(0, Math.cos(p)) : 0;
    L.hip.rotation.x = -sw * 0.75;
    L.knee.rotation.x = 0.5 + lift * 0.5;        // tibia slopes back
    L.ankle.rotation.x = -0.9 - lift * 0.9;      // the backward-bending "knee" of a bird is the ankle
    L.foot.rotation.x = 0.4 + lift * 0.6 - sw * 0.2;
  }
  u.body.position.y = 1.0 + (sp > 0 ? Math.abs(Math.sin(ph)) * 0.06 : 0) - (o.crouch || 0);
  u.body.rotation.x = sp > 0 ? 0.05 : -0.12;   // standing: back slopes down to the tail
  const graze = o.graze || 0, pump = sp > 0 ? Math.sin(ph * 2) * 0.12 : 0;
  u.neckPivot.rotation.x = graze * 1.6 + (sp > 0 ? 0.35 + pump : 0) + (o.neck || 0);
  u.head.rotation.x = -graze * 0.9 - (sp > 0 ? 0.35 : 0) + (o.nod || 0); u.head.rotation.y = o.headYaw || 0;
  for (const E of u.eyes) { E.lid.rotation.x = -1.6 + (o.lid || 0) * 1.25; const lx = o.lookX || 0, ly = o.lookY || 0; E.iris.position.set(lx * 0.012, ly * 0.012, 0.022); E.pupil.position.set(lx * 0.016, ly * 0.016, 0.03); }
}
// slouch hat (3D, real anatomy: dented crown, pleated band, wide brim with one side pinned up, badge)
function slouchHat() {
  const g = new THREE.Group(), felt = std('#9a8050', { roughness: 0.9 });
  const crownPts = [[0, 0], [0.14, 0], [0.135, 0.06], [0.12, 0.11], [0.08, 0.13], [0.03, 0.115], [0, 0.12]].map(([a, b]) => new THREE.Vector2(a, b));
  outlined(new THREE.Mesh(new THREE.LatheGeometry(crownPts, 24), felt), g);
  const band = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.142, 0.04, 24, 1, true), std('#6a5636', { side: THREE.DoubleSide })), g, { ink: false }); band.position.y = 0.025;
  const brimG = new THREE.CylinderGeometry(0.27, 0.27, 0.012, 32, 1); { const p = brimG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x < -0.12) p.setY(i, p.getY(i) + (-x - 0.12) * 1.6); } brimG.computeVertexNormals(); }
  outlined(new THREE.Mesh(brimG, felt), g);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16, 0, Math.PI), std('#e0b050', { metalness: 0.8, roughness: 0.3 })); badge.position.set(-0.17, 0.1, 0.02); badge.rotation.set(0, -Math.PI / 2 + 0.3, 0); g.add(badge);
  return g;
}

  return { makeEmu, poseEmu, slouchHat, EMU_M };
}
