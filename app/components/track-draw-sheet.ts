import { KeySignatureEvent } from "@tonejs/midi/dist/Header";
import { floorTo, map } from "~/util/map";
import {
  findKeySignature,
  KeySignature,
  keySignatures,
  midiToNote,
  midiToOctave,
  offsetBetweenNotes,
  whiteIndexInOctave,
} from "../util/music";
import { SongSettingsExtended } from "./use-song-ticker";

const staffLinesTrebleClef = [64, 67, 71, 74, 77];
const staffLinesBassClef = [43, 47, 50, 53, 57];
const staffLineTrebleMiddle = 71;
const staffLineBassMiddle = 50;
const lineNotes = staffLinesBassClef.concat(staffLinesTrebleClef);

export function drawTrackSheet(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songExt: SongSettingsExtended
) {
  const { width: w, height: h } = ctx.canvas;
  const { high, low } = songExt.songCtx.octaves;
  const tickWindow = songExt.tickWindow;
  const minTick = Math.floor(tick - tickWindow / 4);
  const maxTick = Math.floor(minTick + tickWindow + tickWindow / 4);

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

  function whiteIndex(midi: number) {
    const oct = midiToOctave(midi);
    return oct.octave * 7 + whiteIndexInOctave(oct.index);
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
    // if (
    //   (n == "A#" || n == "C" || n == "C#" || n == "D") &&
    //   ks.startNote === "C#"
    // ) {
    //   console.log("======");
    //   console.log(midi, n);
    //   console.log("=>", { wi });
    //   console.log("=>", { ksI });
    //   console.log({ midiC });
    //   console.log({ midiCOct });
    //   console.log({ res });
    // }
    return res;
  }

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

      ctx.lineWidth = lineWidth * 1.5;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      // at bar
      let x = map(barTick, minTick, maxTick, 0, w) - noteHeight; // - noteHeight put the bar lines to the left of the notes
      ctx.beginPath();
      ctx.moveTo(x, barTopPbx);
      ctx.lineTo(x, barBottomPbx);
      ctx.stroke();
      ctx.closePath();
    }
  }

  let ticksPerPx = map(1, 0, tickWindow, 0, w);
  for (const n of songExt.songCtx.pianoNotes) {
    if (
      n.ticks < minTick - 20 * ticksPerPx ||
      n.ticks > maxTick + 20 * ticksPerPx
    ) {
      continue;
    }
    const wIndex = Math.floor(noteIndex(n.midi, ks)); // TODO we floor here to make every 0.5 note a sharp
    let note = midiToNote(n.midi);
    let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
    const x = map(n.ticks, minTick, maxTick, 0, w);
    ctx.fillStyle = "black";

    // lines for notes not on staff lines
    {
      const wIndexClef = whiteIndex(staffLinesBassClef[0]);
      if (
        wIndex % 2 == wIndexClef % 2 && // not on a line
        (n.midi > staffLinesTrebleClef[staffLinesTrebleClef.length - 1] || // over top staff line
          n.midi < staffLinesBassClef[0] || // blow bottom staff line
          (n.midi < staffLinesTrebleClef[0] &&
            n.midi > staffLinesBassClef[staffLinesBassClef.length - 1])) // betwen treble and clef
      ) {
        // && wIndex % 2 != 0) {
        // not on a staff line draw a small line for it
        ctx.strokeStyle = "black";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x - noteHeight * 1.5, y);
        ctx.lineTo(x + noteHeight * 1.5, y);
        ctx.stroke();
        ctx.closePath();
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
    // accidentals: sharps, TOOD flats and the other one
    if (!ks.notes.includes(note)) {
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
