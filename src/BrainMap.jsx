// Comparative olfactory circuit: Drosophila melanogaster vs Ooceraea biroi
// Circuit: ORN -> AL -> {LH, MB} -> CX -> descending neurons

// ─── Single scale control ────────────────────────────────────────────────────
// Controls the physical box size in App.jsx. 1.0 = default, 0.8 = 80%, etc.
const DIAGRAM_SCALE = 1.3;
window.DIAGRAM_SCALE = DIAGRAM_SCALE;

// Full content extent in SVG coordinates (fixed viewBox, no zoom)
const _VB = { x: 45, y: 33, w: 445, h: 334 };
const VIEWBOX = `${_VB.x} ${_VB.y} ${_VB.w} ${_VB.h}`;
// ─────────────────────────────────────────────────────────────────────────────

const REF_FRAME = {
  x: 58,
  y: 34,
  scale: 1.92,
};

const mapPoint = ([x, y]) => [
  REF_FRAME.x + x * REF_FRAME.scale,
  REF_FRAME.y + y * REF_FRAME.scale,
];

const mapLength = (value) => value * REF_FRAME.scale;

const mapRect = ({ x, y, width, height }) => ({
  x: REF_FRAME.x + x * REF_FRAME.scale,
  y: REF_FRAME.y + y * REF_FRAME.scale,
  width: width * REF_FRAME.scale,
  height: height * REF_FRAME.scale,
});

const REF_TRANSFORM = `translate(${REF_FRAME.x} ${REF_FRAME.y}) scale(${REF_FRAME.scale})`;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const FILL = {
  al: "rgba(214, 122, 162, 0.16)",
  mb: "rgba(230, 171, 62, 0.16)",
  lh: "rgba(244, 149, 33, 0.14)",
  cx: "rgba(89, 186, 88, 0.14)",
};

const FILL_HOV = {
  al: "rgba(214, 122, 162, 0.88)",
  mb: "rgba(230, 171, 62, 0.9)",
  lh: "rgba(244, 149, 33, 0.9)",
  cx: "rgba(89, 186, 88, 0.88)",
};

const SILHOUETTES = {
  fly: {
    path: "M237.56,101.49c-1.11-7.12-5.34-13.13-9.34-18.91-1.33-1.33-2-3.11-2.22-5.12,0-2.45-1.56-4.45-3.56-5.34-4.45-2-9.12-3.78-13.57-5.56-2-1.11-4.45-.44-5.78,1.33-1.11,1.33-2,2.89-2.89,4.45-.22.44-.22,1.11-.67,1.33-1.56.67-1.56,2-2,3.34,0,.44-.44.89-.67.89h-4c-.22,0-.44-.44-.67-.67-.67-1.78-1.56-3.56-2.22-5.34,2.22-2.45,3.56-5.56,4-8.9.22-1.33.22-2.89-.44-4.23-.89-2.45-2.89-4.67-5.34-5.78-.89-.22-1.78-.67-2.45-1.11-.67-.44-1.11-1.11-1.33-1.78-.67-2.45-2.22-4.45-4.45-5.78-2.67-1.33-5.56-2.67-8.45-3.78-4.89-2.22-10.23-3.11-15.57-2.67-1.11,0-2.22,0-3.34-.44-2-1.11-4.23-1.11-6.23-.44-2,.67-4.23,1.11-6.45.89-2.22-.22-4.23,0-6.45.44-4.45.89-9.12,1.11-13.79.89-.67,0-1.11,0-1.78-.22-2.67-.44-5.78-1.11-8.01-1.33-2.45-.22-4.89-.22-7.34-.44-.89,0-1.56-1.11-2.22-1.11-2.45,0-4.89-.44-7.12,1.11-.44.22-.89.44-1.33.22-2.89-.44-6.01-.22-8.9.67-4.89.89-9.57,2.67-13.79,4.89-3.34,1.11-6.01,4-6.9,7.34-.22.89-.89,1.56-1.33,1.78-1.78.89-3.56,2-5.34,3.11-2.22,1.56-3.56,4-3.34,6.67.22,3.78,1.78,7.34,4.23,10.01.22.44.44.89.44,1.11-.44,1.78-1.11,3.56-1.56,5.34h-5.78c-1.56-2.89-3.11-5.78-4.89-8.68-.22-.44-.44-.67-.89-.89-2.22-2-5.56-2.22-8.23-.89-4.45,2.45-8.9,5.12-13.35,7.79-.44.22-.89,1.11-1.11,1.78-.67,1.56-1.33,2.89-2,4.45-1.11,1.78-2.67,3.56-3.78,5.34-1.56,2.22-2.89,4.67-4,7.34-1.78,4-2.89,8.01-3.34,12.01-.22,1.11-.22,2,0,3.11.22,2,.44,4.23.89,6.23.67,3.34,1.33,6.67,2.45,9.79,1.33,3.34,3.11,6.67,5.34,9.57,3.78,5.12,8.68,9.12,14.02,12.24,4.45,2.22,9.12,3.56,14.02,4,1.56,0,2.89,0,4.45-.22,3.78,0,7.56-1.33,10.46-4,1.33-1.33,2.89-2.67,4.45-3.78,2.22-1.11,4.23-2.67,5.56-4.67.67-1.11,1.78-2.22,3.11-2.67,1.33-.67,2.67-1.33,3.78-2.45.89-.89,2-2.22,1.78-3.11-.44-2,0-4,1.11-5.78v-.22c.89-1.78,1.56-3.56,2.67-5.12.89-1.11,1.11-2.67.22-4-.67-1.11-.89-2.22-1.56-3.78.67.44.89.67,1.11.67l.44.44c1.56,2.67,4,4.67,6.9,5.78,1.78.67,3.11,2.22,3.34,4,.67,2.45,1.33,4.89,2.22,7.34,1.78,3.56,4.45,6.45,7.79,8.23,5.12,2.89,10.9,4,16.68,3.34,2-.22,4-.44,6.01-.44,3.34,0,6.67.44,10.01.44,3.56-.22,6.9-1.33,9.57-3.56,1.78-1.33,3.56-3.11,4.89-4.89,1.56-1.78,2.89-4,3.78-6.23.67-1.78,1.11-3.56,1.33-5.56.22-1.11.89-2.22,2-2.67,2.89-1.33,5.56-3.34,7.34-6.01.67-.89,1.56-1.56,2.45-2.22-.44,1.56-1.11,3.11-1.78,4.45-.67.89-.44,2,.44,2.89,1.11,1.11,1.78,2.22,2.22,3.56.67,2.67,2.89,5.12,2.22,8.23,0,.22.22.44.22.67,1.11,2,2.67,3.78,4.89,4.89,1.11.44,2,1.11,2.89,1.78,1.11,1.11,2,2.45,3.34,3.34,2.22,1.56,4.45,3.56,6.45,5.56,1.11,1.11,2.22,1.78,3.78,2.45,3.11,1.33,6.45,2,9.79,1.78,4.45-.22,8.9-1.33,12.9-3.34,3.34-1.78,6.45-3.78,9.34-6.23,4.45-3.56,8.23-8.23,10.68-13.35,2-4.45,3.34-8.9,4-13.79.22-3.56,0-7.56-.44-11.79Z",
    clip: { x: 0, y: 33.7, width: 122.96, height: 122.96 },
  },
  ant: {
    path: "M152.4,33.5c-1.74-1.38-1.54-3.02.25-3.73.88-.35,1.89-.48,2.85-.54,1.98-.12,3.81-.49,5.49-1.68.99-.7,2.26-.98,3.36-1.55.85-.44,1.78-.91,2.41-1.6,1.99-2.18,4.56-2.56,7.15-2.07,3.81.72,7.53,1.88,11.32,2.73,2.25.51,4.55.94,6.85,1.12,2.83.22,5.28,1.05,7.16,3.25,1.78,2.08,4.01,3.93,5.22,6.3,1.57,3.06,2.42,6.51,3.42,9.83.65,2.16,1.03,4.39,1.52,6.6,1.17,5.29.82,10.49-.84,15.64-.16.5.01,1.37.37,1.73,4.26,4.24,4.84,10.01,5.87,15.35.95,4.96-.58,9.85-3.83,13.96-1.23,1.55-2.94,2.13-4.82,2.35-.7.08-1.41.22-2.1.18-4.2-.25-7.09,2.24-9.97,4.72-.34.29-.64.78-.71,1.22-.35,2.18-.43,4.42-.96,6.55-.75,3.02-1.44,6.15-2.86,8.87-.98,1.9-3.05,3.29-4.78,4.73-1.9,1.58-2.67,3.48-2.28,5.87.57,3.56-.87,6.59-3.06,9.08-2.91,3.32-6.13,6.4-9.44,9.34-2.32,2.05-5.42,2.59-8.4,2.43-3.54-.19-7.15-.61-10.56-1.55-2.75-.76-5.32-2.23-7.61-4.16-1.35-1.14-3.16-1.73-4.8-2.51-.53-.25-1.18-.23-1.72-.46-4.89-1.99-8.89-.29-12.59,2.9-.85.73-1.84,1.32-2.82,1.86-4.15,2.28-8.44,3.99-13.28,4.29-2.35.15-4.6.16-6.89-.36-3.65-.83-6.27-3.16-8.51-5.9-2.22-2.71-4.33-5.53-6.16-8.51-1.58-2.59-2.16-5.55-1.07-8.56.44-1.22.16-2.17-.6-3.15-1.06-1.36-2.13-2.53-3.81-3.33-2.08-1-3.37-2.91-3.86-5.33-.55-2.73-1.3-5.43-1.99-8.13-.1-.41-.26-.85-.52-1.18-.89-1.12-.91-2.46-.31-3.52.89-1.58.14-2.36-.94-3.25-2.24-1.86-4.63-3-7.69-2.77-4.67.35-7.49-1.22-9.86-6.54-2.2-4.94-2.51-10.01-.34-15.12.65-1.53.84-3.27,1.53-4.77.8-1.74,1.88-3.35,2.91-4.98.46-.72,1.18-1.29,1.61-2.02.27-.46.46-1.18.29-1.64-1.25-3.27-1.53-6.61-.88-10.03.84-4.44,1.57-8.9,2.62-13.29.51-2.15,1.52-4.21,2.5-6.21,1.44-2.96,3.03-5.8,5.47-8.16,2.43-2.35,5.33-2.84,8.44-3.02,2.95-.18,5.92-.19,8.83-.58,3.46-.46,6.87-1.4,10.34-1.83,1.21-.15,2.7.31,3.76.98,2.32,1.46,4.34,3.4,6.69,4.8,1.47.87,3.28,1.42,4.99,1.56,3.97.34,5.41,1.64,6.26,5.58.34,1.56,1.3,3.07,2.3,4.36,1.18,1.53,2.09,3.09,2.6,4.97.31,1.16,1.09,2.19,1.68,3.26.36.66.89,1.25,1.09,1.95.37,1.26,1.14,1.61,2.37,1.76,2.57.3,5.09.82,7.69.05,1.71-.51,2.79-1.37,3.4-3.1.38-1.06,1.32-1.91,1.95-2.89.41-.64.96-1.34,1-2.04.09-1.65.9-2.79,1.97-3.94,1.82-1.96,3.5-4.05,5.32-6.18Z",
    clip: { x: 134.64, y: 19.03, width: 84.81, height: 137.62 },
  },
};

const FLY_NODES = [
  {
    id: "LH",
    short: "LH",
    label: "Lateral Horn",
    col: "lh",
    labelPos: [61.9, 66.0],
    hoverPos: [33, 79],
    hit: { center: [58, 78], rx: 12, ry: 10 },
    paths: [
      "M55.13,60.67c-.17.95-.31,1.91-.09,2.85.42,1.84,2.13,3.41,3.78,4.9,1.66,1.49,4.2,3.16,6.73,2.44,1.42-2.72,2.86-5.56,2.37-8.43-.9-5.26-11.54-8.79-12.8-1.76Z",
    ],
  },
  {
    id: "MB",
    short: "MB",
    label: "Mushroom Body",
    col: "mb",
    labelPos: [81.2, 62.4],
    hoverPos: [74, 72],
    hit: { center: [87, 72], rx: 18, ry: 14 },
    paths: [
      "M99.49,67.36c2.63-.7,5.26-1.61,7.97-1.54s5.58,1.34,6.84,3.97c.65,1.35.81,2.91.81,4.44,0,.67-.03,1.35-.2,1.99-.25.93-.77,1.74-1.29,2.53-.86,1.32-1.73,2.65-2.59,3.97-.3.46-.61.93-1.04,1.25-1,.72-2.35.39-3.39-.27s-1.9-1.61-2.96-2.19c-1.42-.78-3.06-.84-4.64-.89-5.04-.16-10.09-.32-15.13-.49-1.54-.05-3.2-.15-4.39-1.22-1.66-1.5-1.71-4.21-1.68-6.57s-.16-5.11-1.93-6.43c-.69-.52-1.54-.73-2.23-1.24-1.13-.82-1.72-2.33-1.84-3.81s.15-2.96.42-4.42c.1-.53.21-1.09.54-1.49.27-.33.67-.52,1.06-.66,3.69-1.37,7.69-.04,11.46,1.01.39.11.87.18,1.11-.17.22-.31.09-.77-.05-1.14-1.12-2.92-2.5-6.16-1.42-9.1.88-2.42,3.23-3.83,5.54-4.41,1.03-.25,2.14-.37,3.1.11,1.38.69,2.06,2.51,1.98,4.17s-.81,3.2-1.59,4.63-1.65,2.83-2.11,4.42c-.42,1.49-.47,3.07-.49,4.62-.02,1.55-.03,3.1-.03,4.65,0,.97-.41,3.83.18,4.55.62.76,2.95.55,3.77.5,1.43-.08,2.85-.39,4.24-.76Z",
    ],
  },
  {
    id: "AL",
    short: "AL",
    label: "Antennal Lobe",
    col: "al",
    labelPos: [102.6, 100.3],
    hoverPos: [117, 145],
    hit: { center: [100, 126], rx: 23, ry: 21 },
    paths: [
      "M90.89,82.34c-1.29.26-2.65.64-3.48,1.67-.82,1-.95,2.4-.92,3.7s.19,2.63-.16,3.88c-.2.71-.64,1.4-1.21,1.84-.83.65-1.28,1.66-1.06,2.7.81,3.82,1.93,7.62,4.52,10.45,2.09,2.28,4.95,3.69,7.83,4.81,3.43,1.34,7.04,2.35,10.72,2.36,2.11,0,4.21-.33,6.22-.97,1.35-.43,2.85-1.27,2.98-2.69.03-.29,0-.59.07-.87.1-.39.39-.7.64-1.02,1.02-1.33,1.42-3.03,1.78-4.68.41-1.83.81-3.75.34-5.56-.41-1.59-1.49-3.1-1.22-4.73.07-.39.21-.76.29-1.15.28-1.32-.25-2.79-1.31-3.62-.44-.34-.95-.58-1.36-.96-.88-.82-1.1-2.12-1.56-3.24-.84-2.09-2.83-3.79-5.05-3.82-1.25-.02-2.46.47-3.71.51-.93.03-1.84-.2-2.77-.17-1.02.03-1.44.65-2.27.94s-1.91.05-2.82.04c-2.18-.02-4.35.18-6.49.61Z",
    ],
  },
  {
    id: "CX",
    short: "CX",
    label: "Central Complex",
    col: "cx",
    labelPos: [103.2, 50.0],
    hoverPos: [127, 51],
    hit: { center: [103, 66], rx: 15, ry: 12 },
    paths: [
      "M117.48,52.69c-1,.7-2.17,1.12-3.3,1.57-3.09,1.22-6.07,2.71-8.9,4.46-.58.36-1.17.74-1.55,1.31-.28.42-.42.9-.54,1.39-1.17,4.74.44,9.65,2.9,13.87.67,1.15.98,2.39,2.12,2.93s3.22.2,4.32-.4c.73-.39,1.27-1.05,1.83-1.65,1.31-1.41,1.94-2.32,3.81-2.78.99-.24,2.12-.29,2.85-1.01.85-.83.67-2.17.69-3.35.06-3.58.06-6.96,0-10.87-.04-2.51-.05-4.89-.07-7.37-.02-2.68-3.22,1.24-4.16,1.9Z",
      "M113.25,61.68c-2.21,1.12-4.19,3.13-4.38,5.6-.12,1.65.56,3.24,1.23,4.76.43.98.87,1.96,1.3,2.94.92,2.09,2.08,4.4,4.25,5.11,1.45.48,2.97.44,4.57.23.43-.06,1.01-.32,1.03-.75.13-2.49,0-4.95,0-7.45,0-.36-.25-.67-.61-.75-.31-.07-.62-.17-.89-.34-.45-.27-.8-.77-.75-1.29.12-1.2,1.95-1.37,2.52-2.43.21-.39.21-.86.22-1.3,0-1.56,0-3.12,0-4.68,0-.52,0-1.07-.28-1.51-.97-1.53-6.95,1.23-8.22,1.87Z",
      "M121.69,57.41c.02.76-.48,1.41-1.1,1.2-.16-.05-.32-.12-.45-.22-2.03-1.45-3.55-3.47-5.58-4.92-.82-.59-1.76-1.09-2.79-1.14s-2.14.48-2.46,1.4c-.22.62-.06,1.29.04,1.94.11.68.15,1.36.13,2.04-.01.39-.05.79-.28,1.11-.46.66-1.58.67-2.23.16s-.89-1.36-.89-2.15.19-1.58.24-2.38c.05-.77-.03-1.55.09-2.32.23-1.42,1.17-2.68,2.42-3.5s2.77-1.2,4.28-1.24c.59-.02,1.2.02,1.75.22.74.27,1.32.82,1.86,1.38,1.18,1.22,2.24,2.53,3.19,3.92.39.58,1.49,1.14,1.73,1.65.31.65.04,2.13.06,2.84Z",
    ],
  },
];

const ANT_NODES = [
  {
    id: "CX",
    short: "CX",
    label: "Central Complex",
    col: "cx",
    labelPos: [155.3, 59.6],
    hoverPos: [126, 67],
    hit: { center: [145, 69], rx: 16, ry: 12 },
    paths: [
      "M135.9,63.83c5.96.14,7.51,2.71,8.84,5.98.33.81,2.11,1.03,2.94,1.18,3.3.6,3.74-2.26,4.17-4.71.35-2.01.26-3.31-.63-5.25-.25-.55-1.61-1.72-2.07-2.1-3.85-3.17-6.81-4.58-11.51-5.18-2.48-.32-2.33,1.55-2.33,3.62,0,2.66-.17,6.44.59,6.46Z",
      "M143.19,66.33c-.29-.34-.88-.89-1.18-1.14-.28-.23-1.29-.96-1.62-1.12-1.74-.85-2.91-1-4.81-.73,0,1.89-.02,3.79-.03,5.68,0,.12,0,.24.05.34.04.09.12.15.2.21,1.28.99,2.95,1.31,4.53,1.31,1.07,0,2.13-.15,3.13-.1.56.03,1.37.12,1.55-.64.14-.59-.15-1.08-.46-1.66-.43-.8-.82-1.5-1.37-2.16Z",
      "M135.39,62.42c-.02.43.49.79,1.13.67.17-.03.32-.07.46-.12,2.07-.82,3.63-1.95,5.7-2.77.84-.33,1.8-.61,2.85-.64s2.35.31,2.8.72c.41.36,2.47,2.86,2.64,5.53.02.4-.09.66-.07,1.04.01.22.04.8.27.98.47.37,1.36.08,2.02-.2s.91-.76.91-1.21-.19-.89-.25-1.34c-.05-.43-2.19-5.16-2.69-5.65-.58-.57-1.38-1.49-2.65-1.94s-2.83-.67-4.37-.7c-.61,0-1.22,0-1.79.12-.76.15-1.35.46-1.9.77-1.2.69-2.29,1.42-3.26,2.21-.4.32-1.52.64-1.77.93-.32.36-.04,1.2-.06,1.6Z",
    ],
  },
  {
    id: "MB",
    short: "MB",
    label: "Mushroom Body",
    col: "mb",
    labelPos: [178.7, 45.6],
    hoverPos: [191, 40],
    hit: { center: [176, 60], rx: 32, ry: 22 },
    paths: [
      "M168.66,27.17c-1.58,1.16-2.4,3.24-4.16,4.11-.69.34-1.46.45-2.21.54-2.89.33-6.09.41-8.24,2.37-1.17,1.07-1.85,2.56-2.5,4.01-1.09,2.45-2.18,4.9-3.27,7.34-.75,1.69-1.39,3.98.05,5.15.6.49,1.4.62,2.17.73,3.61.53,7.49,1.03,10.77-.57.63-.31,1.32-.7,2-.52.85.23,1.22,1.23,1.31,2.1.29,2.81-.94,5.61-2.79,7.75-1.85,2.14-2.7,3.4-5.18,4.78-.93.52-2.87,1.64-3.71,2.31s-2.98,1.71-3.97,1.95c-2.35.58-7.97.13-9.11.4-.73.17-2.18.05-2.69.58-.74.76-.87,1.9-.94,2.96-.28,4.5-.73,9.18-.14,13.64.07.55.84,2.46,1.09,2.95.9,1.77,2.85,2.14,4.17,1.47s8.82-4.2,9.97-5.12c3.14-2.51,7.06-5.58,11.03-6.28,2.04-.36,4.15-.86,5.74-2.18,1.09-.9,1.85-2.13,2.59-3.33,1.29-2.09,2.57-4.18,3.86-6.26.88-1.43,1.77-2.87,2.95-4.05,2.37-2.37,5.76-3.57,7.99-6.08,1.12-1.26,2.05-2.91,3.69-3.3,1.39-.33,2.84.4,3.85,1.41s1.69,2.29,2.55,3.42c1.11,1.47,2.59,2.75,4.39,3.2s3.91-.12,4.92-1.66c.47-.71.66-1.57.82-2.4,1.64-9.11-1.74-18.96-8.64-25.17-.94-.85-1.97-1.65-3.19-1.99-1.03-.29-2.12-.24-3.19-.25-4.12-.04-8.28-1.06-11.92-3-2.98-1.59-6.8-3.37-10.03-1Z",
    ],
  },
  {
    id: "AL",
    short: "AL",
    label: "Antennal Lobe",
    col: "al",
    labelPos: [164.6, 124.7],
    hoverPos: [177, 145],
    hit: { center: [171, 126], rx: 23, ry: 30 },
    paths: [
      "M185.51,121.59c-.98.97-2.44,1.15-3.58,1.89-3.62,2.38-2.01,8.16-3.05,12.49-.85,3.55-3.63,6.18-6.27,8.58-3.37,3.07-7.07,6.3-11.53,6.71-2.36.22-4.72-.38-6.98-1.15-4.7-1.6-9.5-4.26-11.56-8.94-1.47-3.35-1.31-7.2-1.12-10.88.12-2.27.27-4.64,1.38-6.59,1.22-2.12,3.38-3.41,5.28-4.89,4.44-3.48,7.66-8.34,11.08-12.91s7.3-9.06,12.43-11.28c6.29-2.72,14.03-.94,16.87,5.93,1.31,3.17,1.35,6.05.64,9.31s-1.32,9.47-3.6,11.72Z",
    ],
  },
  {
    id: "LH",
    short: "LH",
    label: "Lateral Horn",
    col: "lh",
    labelPos: [203.9, 88.5],
    hoverPos: [213, 97],
    hit: { center: [210, 103], rx: 13, ry: 14 },
    paths: [
      "M210.68,91.45c-.91,2.25-2.64,4.38-5.13,5.22-3.68,1.24-7.68-.59-11.08-2.37-.54-.28-1.11-.59-1.42-1.08-.29-.47-.31-1.03-.3-1.57.02-1.05.11-2.11.23-3.15.33-2.81,1.03-5.81,3.33-7.72,2.84-2.36,4.97-3.5,7.31-6.28,1.49-1.78,2.54-3.96,5.31-2.13,3.93,2.6,3.18,15.57,1.75,19.09Z",
    ],
  },
];

const FLOW_ARROWS = [
  {
    key: "fly-a1",
    curve: "M93.59,148.5c8.67-6.03,18.09-25.35,16.12-42.23",
    head: "M108.51,100.36c1.57,2.59,4.01,5.71,6.29,7.49l-5-.79-4.34,2.59c1.46-2.51,2.55-6.31,3.05-9.29Z",
  },
  {
    key: "fly-a2",
    curve: "M104.78,86.7c-1.5-5.6-3.34-10.38-5.65-14.29-1.89-3.19-4.1-5.8-6.7-7.81",
    head: "M87.18,61.6c2.98.54,6.93.79,9.78.26l-3.9,3.22-.94,4.97c-.91-2.75-3.03-6.09-4.93-8.45Z",
  },
  {
    key: "fly-a3",
    curve: "M104.18,84.76c-4.49-13.04-15.06-17.94-28-18.45",
    head: "M70.15,66.37c2.84-1.06,6.36-2.87,8.53-4.78l-1.71,4.76,1.73,4.75c-2.19-1.9-5.72-3.69-8.56-4.73Z",
  },
  {
    key: "fly-a4",
    curve: "M71.11,73.36c-1.43,6.55,1.32,9.4,5.04,8.86",
    head: "M81.5,79.45c-2.12,2.17-4.53,5.3-5.69,7.96l-.48-5.03-3.59-3.56c2.79.79,6.74.9,9.76.64Z",
  },
  {
    key: "fly-a5",
    curve: "M113.42,58.71c14.43,24.13,17.36,74.5-5.98,99.13",
    head: "M102.79,162.11c1.5-2.93,3.05-6.97,3.5-10.16l1.74,5.28,4.37,2.83c-2.9-.07-6.75.92-9.61,2.05Z",
  },
  {
    key: "fly-a6",
    curve: "M78.4,54.59c3.55-5.64,8.82-7.35,14.77-6.79",
    head: "M99.09,48.98c-2.99.51-6.78,1.63-9.28,3.1l2.56-4.36-.82-4.99c1.8,2.27,4.93,4.69,7.53,6.24Z",
  },
  {
    key: "ant-a1",
    curve: "M169.78,152.63c-4.24-3.31-8.82-13.33-8.72-22.75",
    head: "M161.84,123.89c.71,2.94,2.08,6.65,3.72,9.05l-4.52-2.27-4.92,1.15c2.15-1.94,4.35-5.23,5.73-7.93Z",
  },
  {
    key: "ant-a2",
    curve: "M165.06,104.59c1.49-5.17,9.07-13.16,17.85-16.59",
    head: "M188.76,86.5c-2.47,1.76-5.4,4.42-7,6.83l.42-5.04-2.9-4.14c2.61,1.27,6.48,2.08,9.49,2.35Z",
  },
  {
    key: "ant-a3",
    curve: "M170.89,95.95c12.01-10.16,12.55-26.77,7.53-45.33",
    head: "M176.71,44.84c1.8,2.44,4.5,5.33,6.94,6.9l-5.05-.34-4.09,2.97c1.23-2.63,1.98-6.51,2.2-9.53Z",
  },
  {
    key: "ant-a4",
    curve: "M185.52,81.04c-7.11,3.3-15.55.33-24.17-5.68",
    head: "M156.54,71.72c2.91.85,6.81,1.5,9.7,1.28l-4.22,2.79-1.45,4.84c-.62-2.83-2.38-6.37-4.03-8.91Z",
  },
  {
    key: "ant-a5",
    curve: "M145.34,59.56c-14.43,24.48-17.36,75.59,5.98,100.58",
    head: "M155.97,163.9c-2.85-1.02-6.71-1.9-9.61-1.84l4.37-2.54,1.73-4.75c.45,2.86,2,6.5,3.5,9.13Z",
  },
  {
    key: "ant-a6",
    curve: "M171.77,38.55c-6.62-.77-11.25,2.25-14.56,7.24",
    head: "M154.42,51.14c.42-3,.5-6.95-.14-9.78l3.37,3.77,5,.74c-2.71,1.02-5.96,3.27-8.24,5.27Z",
  },
];

const BrainMap = ({ alive = true, scrollProgress = 0 }) => {
  const svgRef = React.useRef(null);
  const pathRefs = React.useRef({});
  const idPrefix = React.useId ? React.useId().replace(/:/g, "") : "brainmap";
  const [hoverFly, setHoverFly] = React.useState(null);
  const [hoverAnt, setHoverAnt] = React.useState(null);
  const [clock, setClock] = React.useState(() => performance.now());
  const [pulses, setPulses] = React.useState([]);
  const clampedProgress = clamp(scrollProgress);

  React.useEffect(() => {
    if (!alive) return undefined;

    let raf;
    const tick = (now) => {
      setClock(now);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [alive]);

  React.useEffect(() => {
    if (!alive) return undefined;

    const rate = Math.max(110, 240 - scrollProgress * 120);
    const intervalId = setInterval(() => {
      setPulses((current) => {
        const arrowKey = FLOW_ARROWS[Math.floor(Math.random() * FLOW_ARROWS.length)]?.key;
        if (!arrowKey) return current;

        const now = performance.now();
        const next = current.concat({
          id: Math.random().toString(36).slice(2),
          arrowKey,
          born: now,
          duration: 1100 + Math.random() * 500,
        });

        return next.filter((pulse) => now - pulse.born < pulse.duration + 200);
      });
    }, rate);

    return () => clearInterval(intervalId);
  }, [alive, scrollProgress]);

  const onLeave = () => {
    setHoverFly(null);
    setHoverAnt(null);
  };

  const flyClipId = `${idPrefix}-fly-clip`;
  const antClipId = `${idPrefix}-ant-clip`;
  const hoverArrowId = `${idPrefix}-hover-arrow`;
  const glowId = `${idPrefix}-pulse-glow`;
  const flyWashId = `${idPrefix}-fly-wash`;
  const antWashId = `${idPrefix}-ant-wash`;
  const haloBlurId = `${idPrefix}-halo-blur`;
  const plateGlowId = `${idPrefix}-plate-glow`;

  const renderRegion = (node, hoveredNode, setHoveredNode) => {
    const isHovered = hoveredNode && hoveredNode.id === node.id;
    const [cx, cy] = mapPoint(node.hit.center);
    const rx = mapLength(node.hit.rx * 1.18);
    const ry = mapLength(node.hit.ry * 1.18);

    return (
      <g key={node.id}>
        {isHovered ? (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={FILL_HOV[node.col]}
            fillOpacity="0.18"
            filter={`url(#${haloBlurId})`}
            style={{ pointerEvents: "none" }}
          />
        ) : null}
        {node.paths.map((path, index) => (
          <path
            key={`${node.id}-vis-${index}`}
            d={path}
            transform={REF_TRANSFORM}
            fill={isHovered ? FILL_HOV[node.col] : FILL[node.col]}
            stroke="currentColor"
            strokeOpacity={0.76 + (isHovered ? 0.22 : 0)}
            strokeWidth={isHovered ? "1.3" : "1.1"}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ pointerEvents: "none", transition: "fill 160ms ease, stroke-opacity 160ms ease" }}
          />
        ))}
        {node.paths.map((path, index) => (
          <path
            key={`${node.id}-hit-${index}`}
            d={path}
            transform={REF_TRANSFORM}
            fill="rgba(0,0,0,0)"
            stroke="rgba(0,0,0,0)"
            strokeWidth="10"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            onPointerEnter={() => setHoveredNode(node)}
            onPointerLeave={() => setHoveredNode(null)}
          />
        ))}
      </g>
    );
  };

  const renderHoverLabel = (node) => {
    if (!node) return null;

    const [x, y] = mapPoint(node.hoverPos);
    const [lineX, lineY] = mapPoint(node.hit.center);

    return (
      <g style={{ pointerEvents: "none" }}>
        <line
          x1={x}
          y1={y + 6}
          x2={lineX}
          y2={lineY - mapLength(node.hit.ry * 0.7)}
          stroke="var(--accent)"
          strokeOpacity="0.72"
          strokeWidth="1"
          markerEnd={`url(#${hoverArrowId})`}
        />
        <circle cx={lineX} cy={lineY - mapLength(node.hit.ry * 0.7)} r="2.2" fill="var(--accent)" fillOpacity="0.84" />
        <text
          x={x}
          y={y}
          textAnchor="middle"
          fontFamily="var(--serif-display)"
          fontStyle="italic"
          fontSize="12"
          fill="currentColor"
          opacity="0.92"
          stroke="rgba(239, 233, 221, 0.94)"
          strokeWidth="4"
          paintOrder="stroke"
        >
          {node.label}
        </text>
      </g>
    );
  };

  const flyClip = mapRect(SILHOUETTES.fly.clip);
  const antClip = mapRect(SILHOUETTES.ant.clip);
  const [dividerX] = mapPoint([128.24, 0]);
  const [flyWashX, flyWashY] = mapPoint([72, 104]);
  const [antWashX, antWashY] = mapPoint([176, 96]);

  return (
    <div className="brainmap">
      <svg
        ref={svgRef}
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Comparative olfactory circuit diagram for fly and ant brains"
        onPointerLeave={onLeave}
      >
        <defs>
          <clipPath id={flyClipId}>
            <rect x={flyClip.x} y={flyClip.y} width={flyClip.width} height={flyClip.height} />
          </clipPath>
          <clipPath id={antClipId}>
            <rect x={antClip.x} y={antClip.y} width={antClip.width} height={antClip.height} />
          </clipPath>
          <marker id={hoverArrowId} markerWidth="8" markerHeight="8" refX="6.6" refY="4" orient="auto">
            <path d="M 0 0 L 7.2 4 L 0 8 z" fill="var(--accent)" fillOpacity="0.92" />
          </marker>
          <radialGradient id={glowId}>
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.78" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={flyWashId}>
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.38)" />
            <stop offset="58%" stopColor="rgba(255, 255, 255, 0.12)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
          <radialGradient id={antWashId}>
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.34)" />
            <stop offset="62%" stopColor="rgba(255, 255, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
          <radialGradient id={plateGlowId}>
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
          <filter id={haloBlurId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <rect x="40" y="18" width="468" height="351" fill={`url(#${plateGlowId})`} opacity="0.82" />
        <ellipse cx={flyWashX} cy={flyWashY} rx={mapLength(56)} ry={mapLength(42)} fill={`url(#${flyWashId})`} opacity="0.72" />
        <ellipse cx={antWashX} cy={antWashY} rx={mapLength(48)} ry={mapLength(54)} fill={`url(#${antWashId})`} opacity="0.74" />

        <g pointerEvents="none">
          <g clipPath={`url(#${flyClipId})`}>
            <path
              d={SILHOUETTES.fly.path}
              transform={REF_TRANSFORM}
              fill="rgba(255, 255, 255, 0.12)"
              stroke="currentColor"
              strokeOpacity="0.46"
              strokeWidth="1.35"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <g clipPath={`url(#${antClipId})`}>
            <path
              d={SILHOUETTES.ant.path}
              transform={REF_TRANSFORM}
              fill="rgba(255, 255, 255, 0.12)"
              stroke="currentColor"
              strokeOpacity="0.46"
              strokeWidth="1.35"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>

        <line
          x1={dividerX}
          y1="20"
          x2={dividerX}
          y2="405"
          stroke="currentColor"
          strokeOpacity="0.26"
          strokeWidth="0.9"
          strokeDasharray="8 8"
          pointerEvents="none"
        />

        <text
          x={mapPoint([78, 10])[0]}
          y="58"
          textAnchor="middle"
          fontFamily="var(--serif-display)"
          fontStyle="italic"
          fontSize="12.5"
          fill="currentColor"
          opacity="0.68"
          pointerEvents="none"
        >
          Drosophila melanogaster
        </text>
        <text
          x={mapPoint([183, 10])[0]}
          y="58"
          textAnchor="middle"
          fontFamily="var(--serif-display)"
          fontStyle="italic"
          fontSize="12.5"
          fill="currentColor"
          opacity="0.68"
          pointerEvents="none"
        >
          Ooceraea biroi
        </text>

        <g>{FLY_NODES.map((node) => renderRegion(node, hoverFly, setHoverFly))}</g>
        <g>{ANT_NODES.map((node) => renderRegion(node, hoverAnt, setHoverAnt))}</g>

        <g opacity={0.72 + clampedProgress * 0.18} pointerEvents="none">
          {FLOW_ARROWS.map((arrow) => (
            <g key={arrow.key}>
              <path
                d={arrow.curve}
                transform={REF_TRANSFORM}
                fill="none"
                stroke="var(--accent)"
                strokeOpacity="0.18"
                strokeWidth="5.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                filter={`url(#${haloBlurId})`}
              />
              <path
                ref={(element) => {
                  if (element) pathRefs.current[arrow.key] = element;
                }}
                d={arrow.curve}
                transform={REF_TRANSFORM}
                fill="none"
                stroke="var(--accent)"
                strokeOpacity="0.86"
                strokeWidth="2.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={arrow.head}
                transform={REF_TRANSFORM}
                fill="var(--accent)"
                fillOpacity="0.18"
                filter={`url(#${haloBlurId})`}
                stroke="none"
              />
              <path
                d={arrow.head}
                transform={REF_TRANSFORM}
                fill="var(--accent)"
                fillOpacity="0.88"
                stroke="none"
              />
            </g>
          ))}
        </g>

        {pulses.map((pulse) => {
          const path = pathRefs.current[pulse.arrowKey];
          if (!path) return null;

          const age = (clock - pulse.born) / pulse.duration;
          if (age < 0 || age > 1) return null;

          const totalLength = path.getTotalLength();
          const sourcePoint = path.getPointAtLength(totalLength * age);
          const [px, py] = mapPoint([sourcePoint.x, sourcePoint.y]);
          const fade = age < 0.14 ? age / 0.14 : age > 0.84 ? (1 - age) / 0.16 : 1;

          return (
            <g key={pulse.id} opacity={fade * (0.48 + clampedProgress * 0.52)} pointerEvents="none">
              <circle cx={px} cy={py} r="10.5" fill={`url(#${glowId})`} />
              <circle cx={px} cy={py} r="4" fill="rgba(255, 255, 255, 0.56)" />
              <circle cx={px} cy={py} r="2.5" fill="var(--accent)" fillOpacity="0.98" />
            </g>
          );
        })}

        {renderHoverLabel(hoverFly)}
        {renderHoverLabel(hoverAnt)}

        <g opacity={0.72} pointerEvents="none">
          <text
            x={mapPoint([90, 180])[0]}
            y="330"
            textAnchor="middle"
            fontFamily="var(--mono)"
            fontSize="10.5"
            letterSpacing="0.08em"
            fill="currentColor"
          >
            ORNs
          </text>
          <text
            x={mapPoint([179, 180])[0]}
            y="330"
            textAnchor="middle"
            fontFamily="var(--mono)"
            fontSize="10.5"
            letterSpacing="0.08em"
            fill="currentColor"
          >
            ORNs
          </text>
          <text
            x={mapPoint([119, 188])[0]}
            y="356"
            textAnchor="middle"
            fontFamily="var(--mono)"
            fontSize="10.5"
            letterSpacing="0.08em"
            fill="currentColor"
          >
            DNs
          </text>
          <text
            x={mapPoint([144, 188])[0]}
            y="356"
            textAnchor="middle"
            fontFamily="var(--mono)"
            fontSize="10.5"
            letterSpacing="0.08em"
            fill="currentColor"
          >
            DNs
          </text>
        </g>


        <g opacity={clamp((clampedProgress - 0.12) * 4)} pointerEvents="none">
          <text
            x={dividerX - 200}
            y="80"
            textAnchor="middle"
            fontFamily="var(--serif-display)"
            fontStyle="italic"
            fontSize="13.5"
            fill="currentColor"
            opacity="0.72"
          >
            same circuit,
          </text>
          <text
            x={dividerX - 200}
            y="95"
            textAnchor="middle"
            fontFamily="var(--serif-display)"
            fontStyle="italic"
            fontSize="13.5"
            fill="currentColor"
            opacity="0.72"
          >
            different connectivity
          </text>
          <text
            x={dividerX - 200}
            y="110"
            textAnchor="middle"
            fontFamily="var(--serif-display)"
            fontStyle="italic"
            fontSize="13.5"
            fill="currentColor"
            opacity="0.72"
          >
            novel functions?
          </text>

          <line
            x1={dividerX - 36}
            y1="300"
            x2={dividerX - 12}
            y2="300"
            stroke="currentColor"
            strokeOpacity="0.16"
            strokeWidth="0.6"
          />
        </g>

        <g opacity={0.52 + clampedProgress * 0.25} pointerEvents="none">
          <text x="50" y="357" fontFamily="var(--mono)" fontSize="9.5" fill="currentColor">
            fig. 01 · olfactory circuit
          </text>
          
        </g>
      </svg>
    </div>
  );
};

window.BrainMap = BrainMap;
