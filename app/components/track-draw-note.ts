import type { KeySignature } from "~/util/key-signature";
import { map } from "~/util/map";
import { MidiNumber, whiteIndex, whiteIndexInKey } from "../util/music";
import {
  lineNotes,
  staffLineBassMiddle,
  staffLineTrebleMiddle,
} from "./track-draw-sheet";

export function drawNote(
  ctx: CanvasRenderingContext2D,
  midi: MidiNumber,
  options: {
    theme: "dark" | "light";
    width: number;
    height: number;
    ks: KeySignature;
    midiMin: MidiNumber;
    midiMax: MidiNumber;
  },
) {
  const o = options;
  const { width: w, height: h } = o;
  const wIndex = Math.floor(whiteIndexInKey(midi, o.ks));
  const midiMinWhiteIndex = whiteIndex(o.midiMin);
  const midiMaxWhiteIndex = whiteIndex(o.midiMax);
  const numWhites = Math.floor(midiMaxWhiteIndex - midiMinWhiteIndex) + 1;

  const y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
  const x = w / 2;
  const noteHeight = Math.floor(h / numWhites) * 2;
  const lineWidth = Math.max(1, noteHeight * 0.1);

  const color = o.theme === "dark" ? "white" : "black";

  // staff lines
  const staffPaddingRatio = 0.1;
  for (const wIndex of lineNotes) {
    let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(staffPaddingRatio * w, y);
    ctx.lineTo((1 - staffPaddingRatio) * w, y);
    ctx.stroke();
    ctx.closePath();
  }

  // head
  {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      noteHeight * 0.8,
      noteHeight * 0.5,
      -Math.PI / 8,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.closePath();
  }
  // stem
  {
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    let dir =
      wIndex < staffLineBassMiddle || wIndex > staffLineTrebleMiddle ? -1 : 1; // up or down
    ctx.moveTo(x + noteHeight * 0.7 * dir, y - noteHeight * 0.1);
    ctx.lineTo(x + noteHeight * 0.7 * dir, y - noteHeight * 3 * dir);

    ctx.stroke();
    ctx.closePath();
  }
}
