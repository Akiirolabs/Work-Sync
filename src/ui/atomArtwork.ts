export const ATOM_TIMING = { chrome: 6000, specular: 4500, orbitA: 3200, orbitB: 4100, orbitC: 2700 } as const;

type AtomFrame = { chrome: number; orbitA: number; orbitB: number; orbitC: number; shineX: number; shineY: number; shineOpacity: number };

export function atomFrameAt(time: number): AtomFrame {
  const cycle = (duration: number) => (time % duration) / duration;
  const shine = Math.sin(cycle(ATOM_TIMING.specular) * Math.PI * 2) * .5 + .5;
  return {
    chrome: cycle(ATOM_TIMING.chrome) * 360,
    orbitA: cycle(ATOM_TIMING.orbitA) * 360,
    orbitB: cycle(ATOM_TIMING.orbitB) * -360,
    orbitC: cycle(ATOM_TIMING.orbitC) * -360,
    shineX: shine * 1.8,
    shineY: shine,
    shineOpacity: .9 - shine * .35,
  };
}

export function renderAtomSvg(frame: AtomFrame = atomFrameAt(0), animated = false): string {
  const transform = (angle: number) => animated ? "" : ` transform="rotate(${angle.toFixed(2)} 16 16)"`;
  const animation = animated ? `<style>
    .ms-atom-chrome{transform-origin:16px 16px;animation:ms-atom-chrome ${ATOM_TIMING.chrome}ms linear infinite}
    .ms-atom-shine{animation:ms-atom-shine ${ATOM_TIMING.specular}ms ease-in-out infinite}
    .ms-atom-a,.ms-atom-b,.ms-atom-c{transform-origin:16px 16px}
    .ms-atom-a{animation:ms-atom-a ${ATOM_TIMING.orbitA}ms linear infinite}
    .ms-atom-b{animation:ms-atom-b ${ATOM_TIMING.orbitB}ms linear infinite}
    .ms-atom-c{animation:ms-atom-c ${ATOM_TIMING.orbitC}ms linear infinite reverse}
    @keyframes ms-atom-chrome{to{transform:rotate(360deg)}}
    @keyframes ms-atom-shine{50%{transform:translate(1.8px,1px);opacity:.55}}
    @keyframes ms-atom-a{to{transform:rotate(360deg)}}
    @keyframes ms-atom-b{to{transform:rotate(-360deg)}}
    @keyframes ms-atom-c{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.ms-atom-chrome,.ms-atom-shine,.ms-atom-a,.ms-atom-b,.ms-atom-c{animation:none}}
  </style>` : "";
  const shineTransform = animated ? "" : ` transform="translate(${frame.shineX.toFixed(2)} ${frame.shineY.toFixed(2)})" opacity="${frame.shineOpacity.toFixed(2)}"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <radialGradient id="ms-orb" cx="32%" cy="28%" r="78%"><stop stop-color="#394550"/><stop offset=".3" stop-color="#171d24"/><stop offset=".65" stop-color="#080b10"/><stop offset="1"/></radialGradient>
      <linearGradient id="ms-chrome" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".38" stop-color="#aebdca"/><stop offset=".68" stop-color="#f3f7fa"/><stop offset="1" stop-color="#718393"/></linearGradient>
      <linearGradient id="ms-sweep" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".24"/><stop offset=".5" stop-color="#8aa0b2" stop-opacity=".04"/><stop offset="1" stop-color="#dfe9f0" stop-opacity=".18"/></linearGradient>
      <filter id="ms-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".38" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="16" cy="16" r="15.25" fill="url(#ms-orb)" stroke="#46525d" stroke-width=".7"/>
    <g class="ms-atom-chrome"${transform(frame.chrome)} opacity=".62"><path d="M4 11c6-7 18-8 24 0M4 22c6 7 18 8 24 0" fill="none" stroke="url(#ms-sweep)" stroke-width="3.2"/></g>
    <g class="ms-atom-shine"${shineTransform}><ellipse cx="10.4" cy="7.7" rx="5.2" ry="2.45" fill="#fff" opacity=".2" transform="rotate(-28 10.4 7.7)"/></g>
    <g fill="none" stroke="url(#ms-chrome)" stroke-width="1.05" stroke-linecap="round" filter="url(#ms-glow)">
      <g class="ms-atom-a"${transform(frame.orbitA)}><ellipse cx="16" cy="16" rx="10.8" ry="4.05"/><circle cx="26.8" cy="16" r="1.25" fill="#e8eef4" stroke="none"/></g>
      <g class="ms-atom-b"${transform(frame.orbitB)}><ellipse cx="16" cy="16" rx="10.8" ry="4.05" transform="rotate(60 16 16)"/><circle cx="10.6" cy="6.65" r="1.12" fill="#dce6ed" stroke="none"/></g>
      <g class="ms-atom-c"${transform(frame.orbitC)}><ellipse cx="16" cy="16" rx="10.8" ry="4.05" transform="rotate(-60 16 16)"/><circle cx="10.6" cy="25.35" r="1.05" fill="#dce6ed" stroke="none"/></g>
    </g>
    <circle cx="16" cy="16" r="1.85" fill="#f4f8fb" filter="url(#ms-glow)"/>
    ${animation}
  </svg>`;
}
