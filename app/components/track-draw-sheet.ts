import type { KeySignatureEvent } from "@tonejs/midi/dist/Header";
import type { KeySignature } from "~/util/key-signature";
import { findKeySignature, keySignatures } from "~/util/key-signature";
import { map } from "~/util/map";
import {
  midiToNote,
  midiToOctave,
  noteInKeySignature,
  whiteIndexInOctave,
  whiteIndex,
  whiteIndexInKey,
  MidiNumber,
} from "../util/music";
import { drawGlyph } from "./glyph";
import type { MidiEngine } from "./midi-valtio";
import type { Note } from "./use-song-sounds";
import { Midi } from "@tonejs/midi";

type TickNumber = number;

export const staffLinesTrebleClef: Array<MidiNumber> = [64, 67, 71, 74, 77];
export const staffLinesBassClef: Array<MidiNumber> = [43, 47, 50, 53, 57];
const staffLineTrebleMiddle = 71;
const staffLineBassMiddle = 50;
const lineNotes = staffLinesBassClef.concat(staffLinesTrebleClef);
const tickHistoryRatio = 1 / 8;

export function sheetTickWindow(tickWindow: TickNumber): number {
  const tickHistory = (tickHistoryRatio * tickWindow) / (1 - tickHistoryRatio);
  return tickWindow + tickHistory;
}

// if midi is a black key return the next or previous white midi
function toWhiteMidi(midi: number, direction: -1 | 1) {
  const { index } = midiToOctave(midi);
  const wi = whiteIndexInOctave(index);
  if (wi % 1 !== 0) {
    return midi + direction;
  } else {
    return midi;
  }
}

function onStaffLine(n: number, ks: KeySignature) {
  const wIndex = Math.floor(whiteIndexInKey(n, ks)); // TODO we floor here to make every 0.5 note a sharp
  return wIndex % 2 == whiteIndex(staffLinesBassClef[0]) % 2;
}

function clefPosition(n: number): "over" | "under" | "between" | "in-clef" {
  // over top staff line
  if (n > staffLinesTrebleClef[staffLinesTrebleClef.length - 1]) {
    return "over";
  }
  // below bottom staff line
  if (n < staffLinesBassClef[0]) {
    return "under";
  }
  // between treble and clef
  if (
    n < staffLinesTrebleClef[0] &&
    n > staffLinesBassClef[staffLinesBassClef.length - 1]
  ) {
    return "between";
  }
  return "in-clef";
}

export function keySignatureForTick(tick: number, song: Midi) {
  let kse: KeySignatureEvent | undefined;
  for (let l = song.header.keySignatures.length, i = l - 1; i >= 0; i--) {
    const ks = song.header.keySignatures[i];
    // 101 in [ 0 , 100, 200, 300] => 100
    if (ks.ticks < Math.max(1, tick)) {
      kse = ks;
      break;
    }
  }

  return findKeySignature(kse) || keySignatures["C-major"];
}

export function drawTrackSheet(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songExt: MidiEngine,
  pressed: Map<number, Note>
) {
  const { width: w, height: h } = ctx.canvas;
  const { high, low } = songExt.octaves;
  const tickWindow = sheetTickWindow(songExt.tickWindow);
  const minTick = tick - tickWindow * tickHistoryRatio;
  const maxTick = minTick + tickWindow;

  const ks = songExt.keySignature;

  // tickline and bg
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "black";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${ks.key}  (${ks.notes.join(",")})`, 15, 15);
  {
    const tickX = map(tick, minTick, maxTick, 0, w);
    // bg to left of tickline
    ctx.fillStyle = "rgba(150, 140, 100, 0.2)";
    ctx.fillRect(0, 0, tickX, h);
    // tickline
    ctx.strokeStyle = "gold";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tickX, 0);
    ctx.lineTo(tickX, h);
    ctx.stroke();
    ctx.closePath();
  }

  let midiMin = 21; // 88 keys
  let midiMax = 108; // 88 keys
  if (false) {
    midiMin = toWhiteMidi(Math.min(low, lineNotes[0]) - 4, -1);
    midiMax = toWhiteMidi(
      Math.max(high, lineNotes[lineNotes.length - 1]) + 4,
      1
    );
  }

  const midiMinWhiteIndex = whiteIndex(midiMin); //whiteIndexInKey(midiMin, ks);
  const midiMaxWhiteIndex = whiteIndex(midiMax);

  const numWhites = Math.floor(midiMaxWhiteIndex - midiMinWhiteIndex) + 1;
  const noteHeight = Math.floor(h / numWhites) * 2;
  const lineWidth = Math.max(1, noteHeight * 0.1);

  // staff lines
  for (const midi of lineNotes) {
    const wIndex = whiteIndex(midi);
    let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.closePath();
  }
  // bar lines
  {
    const barTopPbx = map(
      whiteIndex(lineNotes[lineNotes.length - 1]),
      midiMinWhiteIndex,
      midiMaxWhiteIndex,
      h,
      0
    );
    const barBottomPbx = map(
      whiteIndex(lineNotes[0]),
      midiMinWhiteIndex,
      midiMaxWhiteIndex,
      h,
      0
    );
    for (
      let barTick = 0;
      barTick < maxTick;
      barTick = barTick + songExt.ticksPerBar
    ) {
      if (barTick < minTick) {
        continue;
      }
      if (barTick > maxTick) {
        break;
      }

      const bar = Math.floor(barTick / songExt.ticksPerBar) + 1;
      ctx.lineWidth = lineWidth * 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      // at bar
      let x = map(barTick, minTick, maxTick, 0, w) - songExt.ticksPerBar / 64; // - noteHeight put the bar lines to the left of the notes
      ctx.beginPath();
      ctx.moveTo(x, barTopPbx);
      ctx.lineTo(x, barBottomPbx);
      ctx.stroke();
      ctx.closePath();
      ctx.fillText(bar.toString(), x, barTopPbx - 5);
    }
  }

  // draw notes
  //let ticksPerPx = map(1, 0, tickWindow, 0, w);
  let notesInView = new Array<{
    midi: number;
    ticks: number;
    time: number;
    durationTicks: number;
    isFromInput?: boolean;
  }>();
  for (const n of songExt.pianoNotes) {
    if (n.ticks + n.durationTicks < minTick) {
      // out of bounds left
      continue;
    }
    if (n.ticks > maxTick) {
      continue;
    }
    notesInView.push(n);
  }
  for (const [, n] of pressed) {
    notesInView.push({
      ...n,
      ticks: tick,
      time: map(tick, 0, songExt.song.durationTicks, 0, songExt.song.duration),
      durationTicks: 0,
      isFromInput: true,
    });
  }

  let bar = -1;
  const barAccidentals = new Map<number, "sharp" | "flat">();
  const extraStafflines = new Map<number, { high: number; low: number }>();
  for (const n of notesInView) {
    // const wIndex =
    //   ks.accidental === "sharp"
    //     ? Math.floor(whiteIndexInKey(n.midi, ks)) // floor here to make every 0.5 note a sharp
    //     : Math.ceil(whiteIndexInKey(n.midi, ks)); // ceil here to make every 0.5 note a flat
    const wIndex = Math.floor(whiteIndexInKey(n.midi, ks)); // floor here to make every 0.5 note a sharp
    let note = midiToNote(n.midi);
    let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
    const x = map(n.ticks, minTick, maxTick, 0, w);
    ctx.fillStyle = "black";

    // lines for notes not on staff lines
    {
      function drawExtraStaff(midi: number) {
        const wIndex = Math.floor(whiteIndexInKey(midi, ks));
        let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x - noteHeight * 1.5, y);
        ctx.lineTo(x + noteHeight * 1.5, y);
        ctx.stroke();
        ctx.closePath();
      }
      if (clefPosition(n.midi) !== "in-clef") {
        const before = extraStafflines.get(n.ticks) || {
          high: staffLinesTrebleClef[staffLinesTrebleClef.length - 1],
          low: staffLinesBassClef[0],
        };
        switch (true) {
          case n.midi > before.high: {
            // draw new lines from
            for (let i = before.high + 1; i <= n.midi; i++) {
              // todo consider halftone semitone sharps and flats
              // to not draw more than once
              if (onStaffLine(i, ks)) {
                drawExtraStaff(i);
              }
            }
            extraStafflines.set(n.ticks, { ...before, high: n.midi });
            break;
          }
          case n.midi < before.low: {
            for (let i = before.low - 3; i >= n.midi; i--) {
              if (onStaffLine(i, ks)) {
                drawExtraStaff(i);
              }
            }
            extraStafflines.set(n.ticks, { ...before, low: n.midi });
            break;
          }
          default:
            // between
            if (onStaffLine(n.midi, ks)) {
              drawExtraStaff(n.midi);
            }
            break;
        }
      }
    }

    const isOn = tick >= n.ticks && tick <= n.ticks + n.durationTicks;
    if (n.isFromInput) {
      ctx.fillStyle = "red";
      ctx.strokeStyle = "red";
    } else if (isOn) {
      ctx.fillStyle = "gold";
      ctx.strokeStyle = "black";
    } else {
      ctx.fillStyle = "black";
      ctx.strokeStyle = "black";
    }

    // ellipse note shape
    {
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        noteHeight * 0.8,
        noteHeight * 0.5,
        -Math.PI / 8,
        0,
        Math.PI * 2
      );
      ctx.fill();
      if (isOn) {
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
      ctx.closePath();
    }
    // stem
    {
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      let dir =
        n.midi < staffLineBassMiddle || n.midi > staffLineTrebleMiddle ? -1 : 1; // up or down
      ctx.moveTo(x + noteHeight * 0.7 * dir, y - noteHeight * 0.1);
      ctx.lineTo(x + noteHeight * 0.7 * dir, y - noteHeight * 3 * dir);

      ctx.stroke();
      ctx.closePath();
    }
    // in the same bar:
    // 1. if midi note has sharp before we do not need to draw it again
    // 2. if midi note at same y pos has sharp before we need a natural accidental
    //    go through all notes that has accidentals check if their y is tha same as the current note
    //    remote accidental
    //
    // accidentals: sharps, TOOD flats and the other one
    const currentBar = Math.floor(n.ticks / songExt.ticksPerBar);
    if (currentBar != bar) {
      barAccidentals.clear();
      bar = currentBar;
    }
    // todo handle flats
    if (!noteInKeySignature(note, ks) && !barAccidentals.has(wIndex)) {
      ctx.fillStyle = "black";
      barAccidentals.set(wIndex, ks.accidental);
      // not in key signature
      // accidental
      drawGlyph(ctx, ks.accidental, x, y, noteHeight);
    }
  }
}

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
  }
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
  for (const midi of lineNotes) {
    const wIndex = whiteIndex(midi);
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
      Math.PI * 2
    );
    ctx.fill();
    ctx.closePath();
  }
  // stem
  {
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    let dir =
      midi < staffLineBassMiddle || midi > staffLineTrebleMiddle ? -1 : 1; // up or down
    ctx.moveTo(x + noteHeight * 0.7 * dir, y - noteHeight * 0.1);
    ctx.lineTo(x + noteHeight * 0.7 * dir, y - noteHeight * 3 * dir);

    ctx.stroke();
    ctx.closePath();
  }
}
