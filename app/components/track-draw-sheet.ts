import { map } from "~/util/map";
import {
  findKeySignature,
  keySignatures,
  midiToNote,
  midiToOctave,
  numWhiteInOctate,
  whiteIndexInOctave,
} from "../util/music";
import { SongSettingsExtended } from "./use-song-ticker";

const staffLinesTreble = [64, 67, 71, 74, 77];
const staffLinesClef = [43, 47, 50, 53, 57];
const lineNotes = staffLinesClef.concat(staffLinesTreble);

export function drawTrackSheet(
  ctx: CanvasRenderingContext2D,
  tick: number,
  songExt: SongSettingsExtended
) {
  const { width: w, height: h } = ctx.canvas;
  const { high, low } = songExt.songCtx.octaves;
  const tickWindow = songExt.tickWindow;
  const minTick = Math.floor(tick - tickWindow / 4);
  const maxTick = Math.floor(tick + tickWindow);

  const ks =
    findKeySignature(
      songExt.songCtx.song.header.keySignatures.find(
        (ks) => tick < 0 || tick >= ks.ticks
      )
    ) || keySignatures["C-major"];

  // tickline and bg
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);
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

  // | |x| | |x| |  |  |
  // | 2-- | 5-- |  |  |
  // |  |  |  |  |  |  |
  // 1- 3- 4- 6- 7- 8-

  // white left = index
  // white left = index + w
  // black left = index - w/2
  // black right = index + w/2

  // const midiMin = 21; // 88 keys
  // const midiMax = 108; // 88 keys

  const midiMin = low - 2;
  const midiMax = high + 2;

  const minOctave = midiToOctave(midiMin);
  const whitesInMinOctave =
    numWhiteInOctate - whiteIndexInOctave(minOctave.index);
  const whitesInMinOctaveNotUsed = numWhiteInOctate - whitesInMinOctave;

  function whiteIndex(n: number) {
    const oct = midiToOctave(n);
    return (
      Math.floor(whiteIndexInOctave(oct.index)) +
      (oct.octave === minOctave.octave
        ? -whitesInMinOctaveNotUsed
        : whitesInMinOctave +
          (oct.octave - (minOctave.octave + 1)) * numWhiteInOctate)
    );
  }
  const midiMinWhiteIndex = 0;
  const midiMaxWhiteIndex = whiteIndex(midiMax);
  const numWhites = midiMaxWhiteIndex + 1;
  const noteHeight = Math.floor(h / numWhites) * 2;

  for (const n of lineNotes) {
    const wIndex = whiteIndex(n);
    let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 0.5;
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

      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      // at bar
      let x = map(barTick, minTick, maxTick, 0, w) - noteHeight; // - noteHeight put the bar lines to the left of the notes
      ctx.fillRect(x, barTopPbx, 2, barBottomPbx - barTopPbx);
    }
  }

  for (const n of songExt.songCtx.pianoNotes) {
    if (n.ticks < minTick || n.ticks > maxTick) {
      continue;
    }
    const wIndex = whiteIndex(n.midi);
    let y = map(wIndex, midiMinWhiteIndex, midiMaxWhiteIndex, h, 0);
    const x = map(n.ticks, minTick, maxTick, 0, w);
    ctx.fillStyle = "black";
    //ctx.fillRect(x, y - noteHeight / 2, 10, noteHeight);

    let note = midiToNote(n.midi);
    if (!ks.notes.includes(note)) {
      //console.log("note in scale", note, ks.notes);
      const w = 30;
      const h = 100;

      ctx.save();
      ctx.translate(x - noteHeight * 1.75, y - noteHeight / 2);
      ctx.scale(noteHeight / w, noteHeight / h);
      // 100 100 canvas
      ctx.fillStyle = "black";
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

    ctx.fillStyle = "black";
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

    const wIndexClef = whiteIndex(staffLinesClef[0]);
    if (
      wIndex % 2 == wIndexClef % 2 && // not on a line
      (n.midi > staffLinesTreble[staffLinesTreble.length - 1] || // over top staff line
        n.midi < staffLinesClef[0] || // blow bottom staff line
        (n.midi < staffLinesTreble[0] &&
          n.midi > staffLinesClef[staffLinesClef.length - 1])) // betwen treble and clef
    ) {
      // && wIndex % 2 != 0) {
      // not on a staff line draw a small line for it
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - noteHeight * 1.5, y);
      ctx.lineTo(x + noteHeight * 1.5, y);
      ctx.stroke();
      ctx.closePath();
    }
  }
}
