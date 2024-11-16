import type { Midi } from "@tonejs/midi";
import type { KeySignatureEvent } from "@tonejs/midi/dist/Header";
import { findKeySignature, keySignatures } from "~/util/key-signature";
import { ceilTo, floorTo, map } from "~/util/map";
import type { MidiNumber, WhiteIndex } from "../util/music";
import {
  midiToNote,
  midiToOctave,
  noteInKeySignature,
  offsetBetweenNotes,
  toMidiTone,
  whiteIndex,
  whiteIndexInKey,
  whiteIndexInOctave,
} from "../util/music";
import { drawGlyph } from "./glyph";
import type { MidiEngine } from "./midi-valtio";
import type { Note } from "./use-song-sounds";
import { detectChord } from "../util/music-chord";

type TickNumber = number;

export const staffLinesTrebleClef = [64, 67, 71, 74, 77].map((i) =>
  whiteIndex(i)
);
export const staffLinesBassClef = [43, 47, 50, 53, 57].map((i) =>
  whiteIndex(i)
);
export const staffMiddleC = whiteIndex(60);
export const staffLineTrebleMiddle = whiteIndex(71);
export const staffLineBassMiddle = whiteIndex(50);
export const lineNotes = staffLinesBassClef.concat(staffLinesTrebleClef);
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

function onStaffLine(wIndex: WhiteIndex) {
  return wIndex % 2 == staffLinesBassClef[0] % 2;
}

function clefPosition(n: WhiteIndex): "over" | "under" | "between" | "in-clef" {
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

  // tickline and bg
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "black";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${ks.key}  (${ks.notes.join(",")})`, 16, 16);
  const tickX = map(tick, minTick, maxTick, 0, w);
  {
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

    drawGlyph(
      ctx,
      "treble_clef",
      tickX / 8,
      map(whiteIndex(67 /*G*/), midiMinWhiteIndex, midiMaxWhiteIndex, h, 0),
      noteHeight
    );
    drawGlyph(
      ctx,
      "bas_clef",
      tickX / 8,
      map(whiteIndex(53 /*F*/), midiMinWhiteIndex, midiMaxWhiteIndex, h, 0),
      noteHeight
    );

    let i = 0;

    const order = {
      sharp: ["F#", "C#", "G#", "D#", "A#", "E#", "B#"],
      flat: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"],
    };
    const ksAccidentals = ks.notes.filter((n) => n.length > 1);
    for (const n of ksAccidentals) {
      const accidental = n[1] === "#" ? "sharp" : "flat";
      const i = order[accidental].indexOf(n);

      const y = map(
        whiteIndex(72 /*C*/ + offsetBetweenNotes("C", n) - 1), // -1 since it is a sharp but key signature should not mark it as one
        midiMinWhiteIndex,
        midiMaxWhiteIndex,
        h,
        0
      );
      drawGlyph(
        ctx,
        accidental,
        map(i, 0, ksAccidentals.length, noteHeight * 5, tickX),
        y,
        noteHeight
      );
    }
  }

  // staff lines
  for (const wIndex of lineNotes) {
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
      lineNotes[lineNotes.length - 1],
      midiMinWhiteIndex,
      midiMaxWhiteIndex,
      h,
      0
    );
    const barBottomPbx = map(
      lineNotes[0],
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
      let x = map(barTick, minTick, maxTick, 0, w); //- songExt.ticksPerBar / 64; // - noteHeight put the bar lines to the left of the notes
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

  const minBar = floorTo(minTick, songExt.ticksPerBar);
  const maxBar = ceilTo(maxTick, songExt.ticksPerBar);

  for (const n of songExt.pianoNotes) {
    if (n.ticks + n.durationTicks < minBar) {
      // out of bounds left
      continue;
    }
    if (n.ticks > maxBar) {
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
  const extraStafflines = new Map<
    WhiteIndex,
    { high: WhiteIndex; low: WhiteIndex }
  >();

  let notesOn: MidiNumber[] = [];
  for (const n of notesInView) {
    const wIndex =
      ks.accidental === "sharp"
        ? Math.floor(whiteIndexInKey(n.midi, ks)) // floor here to make every 0.5 note a sharp
        : Math.ceil(whiteIndexInKey(n.midi, ks)); // ceil here to make every 0.5 note a flat
    // const wIndex = Math.floor(whiteIndexInKey(n.midi, ks)); // floor here to make every 0.5 note a sharp
    let note = midiToNote(n.midi);
    let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
    const x = map(n.ticks, minTick, maxTick, 0, w);
    // note length, 1, 2, 4, 8, 16, 32, 64, 128
    const noteLength = Math.pow(
      2,
      Math.round(Math.log2(songExt.ticksPerBar / n.durationTicks))
    );
    ctx.fillStyle = "black";

    // lines for notes not on staff lines
    {
      function drawExtraStaff(wIndex: WhiteIndex) {
        let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
        ctx.strokeStyle = "black";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x - noteHeight * 0.4, y);
        ctx.lineTo(x + noteHeight * 1.6 * (noteLength === 1 ? 1.4 : 1), y);
        ctx.stroke();
        ctx.closePath();
      }
      if (clefPosition(wIndex) !== "in-clef") {
        const before = extraStafflines.get(n.ticks) || {
          high: staffLinesTrebleClef[staffLinesTrebleClef.length - 1],
          low: staffLinesBassClef[0],
        };
        switch (true) {
          case wIndex > before.high: {
            // draw new lines from
            for (let i = before.high + 2; i <= wIndex; i = i + 2) {
              // todo consider halftone semitone sharps and flats
              // to not draw more than once
              if (onStaffLine(i)) {
                drawExtraStaff(i);
              }
            }
            extraStafflines.set(n.ticks, { ...before, high: wIndex });
            break;
          }
          case wIndex < before.low: {
            for (let i = before.low - 2; i >= wIndex; i = i - 2) {
              drawExtraStaff(i);
            }
            extraStafflines.set(n.ticks, { ...before, low: wIndex });
            break;
          }
          case wIndex == staffMiddleC:
            {
              drawExtraStaff(wIndex);
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
      notesOn.push(n.midi);
      ctx.fillStyle = "gold";
      ctx.strokeStyle = "black";
    } else {
      ctx.fillStyle = "black";
      ctx.strokeStyle = "black";
    }

    // ellipse note shape
    {
      //ctx.fillText("" + `${noteLength}`, x + 40, y);
      drawGlyph(
        ctx,
        noteLength === 1 ? "note1th" : noteLength === 2 ? "note2th" : "note4th",
        x,
        y,
        noteHeight,
        isOn ? "gold" : "black"
      );
    }
    // stem
    if (noteLength > 1) {
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      let dir =
        wIndex < staffLineBassMiddle || wIndex > staffLineTrebleMiddle ? -1 : 1; // up or down
      let stemX = x + noteHeight * 0.6 + noteHeight * 0.5 * dir;
      let stemYstart = y - noteHeight * 0.1;
      let stemYstop = y - noteHeight * 3 * dir;
      ctx.moveTo(stemX, stemYstart);
      ctx.lineTo(stemX, stemYstop);
      ctx.strokeStyle = isOn ? "gold" : "black";
      ctx.stroke();
      ctx.closePath();
      // stem flag
      if (noteLength > 4) {
        drawGlyph(
          ctx,
          noteLength === 8
            ? "note8thFlag"
            : noteLength === 16
            ? "note16thFlag"
            : noteLength === 32
            ? "note32thFlag"
            : noteLength === 64
            ? "note64thFlag"
            : noteLength === 128
            ? "note128thFlag"
            : "note8thFlag",
          stemX,
          stemYstop,
          noteHeight,
          isOn ? "gold" : "black",
          stemYstart < stemYstop
        );
      }
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

  const chord = detectChord(notesOn);
  if (chord) {
    ctx.fillStyle = "black";
    ctx.font = "16px sans-serif";
    ctx.fillText(`${chord.chord}`, tickX + 16, 16);
  }
  const chordPressed = detectChord(Array.from(pressed.keys()));
  if (chordPressed) {
    ctx.fillStyle = "black";
    ctx.font = "16px sans-serif";
    ctx.fillText(`${chordPressed?.chord}`, tickX + 16, 16 * 2);
  }
}
