import type { KeySignatureEvent } from "@tonejs/midi/dist/Header";
import { floorTo, map } from "~/util/map";
import {
  findKeySignature,
  keySignatures,
  midiToNote,
  midiToOctave,
  offsetBetweenNotes,
  whiteIndexInOctave,
} from "../util/music";
import type { KeySignature } from "../util/music";
import type { SongSettingsExtended } from "./use-song-ticker";
import type { Note } from "@tonejs/midi/dist/Note";

type TickNumber = number;

const staffLinesTrebleClef = [64, 67, 71, 74, 77];
const staffLinesBassClef = [43, 47, 50, 53, 57];
const staffLineTrebleMiddle = 71;
const staffLineBassMiddle = 50;
const lineNotes = staffLinesBassClef.concat(staffLinesTrebleClef);
const tickHistoryRatio = 1 / 8;

export function sheetTickWindow(tickWindow: TickNumber): number {
  const tickHistory = (tickHistoryRatio * tickWindow) / (1 - tickHistoryRatio);
  return tickWindow + tickHistory;
}

function whiteIndex(midi: number) {
  const oct = midiToOctave(midi);
  return oct.octave * 7 + whiteIndexInOctave(oct.index);
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

function noteIndex(midi: number, ks: KeySignature) {
  const n = midiToNote(midi);
  const cOffMidi = offsetBetweenNotes("C", ks.startNote);
  const wi = Math.floor(whiteIndexInOctave(cOffMidi)); // from C to n

  const ksOffMidi = offsetBetweenNotes(ks.startNote, n);
  const ksI = whiteIndexInOctave(ksOffMidi); // from key start to n

  // where is the previous C
  const midiC = floorTo(midi - (ksOffMidi + cOffMidi), 12);
  let midiCOct = midiToOctave(midiC).octave;

  const res = midiCOct * 7 + wi + ksI;
  return res;
}

function onStaffLine(n: number, ks: KeySignature) {
  const wIndex = Math.floor(noteIndex(n, ks)); // TODO we floor here to make every 0.5 note a sharp
  return wIndex % 2 == whiteIndex(staffLinesBassClef[0]) % 2;
}

function clefPosition(
  n: number,
  ks: KeySignature
): "over" | "under" | "between" | "in-clef" {
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

export function drawTrackSheet(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songExt: SongSettingsExtended
) {
  const { width: w, height: h } = ctx.canvas;
  const { high, low } = songExt.songCtx.octaves;
  const tickWindow = sheetTickWindow(songExt.tickWindow);
  const minTick = Math.floor(tick - tickWindow * tickHistoryRatio);
  const maxTick = Math.floor(minTick + tickWindow);

  let kse: KeySignatureEvent | undefined;
  for (
    let l = songExt.songCtx.song.header.keySignatures.length, i = l - 1;
    i >= 0;
    i--
  ) {
    const ks = songExt.songCtx.song.header.keySignatures[i];
    // 101 in [ 0 , 100, 200, 300] => 100
    if (ks.ticks < Math.max(1, tick)) {
      kse = ks;
      break;
    }
  }

  const ks = findKeySignature(kse) || keySignatures["C-major"];

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
  if (true) {
    midiMin = toWhiteMidi(Math.min(low - 2, lineNotes[0]), -1);
    midiMax = toWhiteMidi(
      Math.max(high + 2, lineNotes[lineNotes.length - 1] + 8),
      1
    );
  }

  const midiMinWhiteIndex = whiteIndex(midiMin);
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
      barTick = barTick + songExt.songCtx.ticksPerBar
    ) {
      if (barTick < minTick) {
        continue;
      }
      if (barTick > maxTick) {
        break;
      }

      const bar = Math.floor(barTick / songExt.songCtx.ticksPerBar) + 1;
      ctx.lineWidth = lineWidth * 1.5;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      // at bar
      let x =
        map(barTick, minTick, maxTick, 0, w) - songExt.songCtx.ticksPerBar / 64; // - noteHeight put the bar lines to the left of the notes
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
  let notesInView = new Array<Note>();
  for (const n of songExt.songCtx.pianoNotes) {
    if (n.ticks + n.durationTicks < minTick) {
      // out of bounds left
      continue;
    }
    if (n.ticks > maxTick) {
      continue;
    }
    notesInView.push(n);
  }

  let bar = -1;
  const barAccidentals = new Map<number, "sharp" | "flat">();
  const extraStafflines = new Map<number, { high: number; low: number }>();
  for (const n of notesInView) {
    const wIndex = Math.floor(noteIndex(n.midi, ks)); // TODO we floor here to make every 0.5 note a sharp
    let note = midiToNote(n.midi);
    let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
    const x = map(n.ticks, minTick, maxTick, 0, w);
    ctx.fillStyle = "black";

    // lines for notes not on staff lines
    {
      function drawExtraStaff(midi: number) {
        const wIndex = Math.floor(noteIndex(midi, ks));
        let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
        ctx.strokeStyle = "black";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x - noteHeight * 1.5, y);
        ctx.lineTo(x + noteHeight * 1.5, y);
        ctx.stroke();
        ctx.closePath();
      }
      if (clefPosition(n.midi, ks) !== "in-clef") {
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
            // middle c
            drawExtraStaff(n.midi);
            break;
        }
      }
    }

    const isOn = tick >= n.ticks && tick <= n.ticks + n.durationTicks;
    if (isOn) {
      ctx.fillStyle = "gold";
      ctx.strokeStyle = "gold";
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
    const currentBar = Math.floor(n.ticks / songExt.songCtx.ticksPerBar);
    if (currentBar != bar) {
      barAccidentals.clear();
      bar = currentBar;
    }
    if (ks.notes.includes(note)) {
    } else if (!barAccidentals.has(wIndex)) {
      barAccidentals.set(wIndex, "sharp");
      // not in key signature
      // accidental
      const w = 30;
      const h = 100;

      ctx.save();
      ctx.translate(x - noteHeight * 1.75, y - noteHeight / 2);
      ctx.scale(noteHeight / w, noteHeight / h);
      // 100 100 canvas
      let t = 10;
      let t2 = t / 2;
      // horisontal
      ctx.fillRect(0, h * 0.25 - t2, w, t);
      ctx.fillRect(0, h * 0.75 - t2, w, t);
      // vertical
      ctx.fillRect(w * 0.25 - t2 / 2, 0, t / 2, h);
      ctx.fillRect(w * 0.75 - t2 / 2, 0, t / 2, h);

      ctx.restore();
    }
  }
}
