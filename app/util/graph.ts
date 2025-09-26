export type Triples = Array<Triple>;
export type Triple = [string, string, string];
export type Matcher = string | null | undefined | ((val: string) => boolean);

export class GraphDB {
  data: Triples = [];

  private add(sub: string, pre: string, obj: string) {
    const exists = this.data.some(
      ([s, p, o]) => s === sub && p === pre && o === obj,
    );
    if (!exists) {
      this.data.push([sub, pre, obj]);
    }
  }

  addAll(tripes: Triples) {
    for (const t of tripes) {
      this.add(t[0], t[1], t[2]);
    }
  }

  test(m: Matcher, val: string) {
    if (typeof m === "function") {
      return m(val);
    }
    if (typeof m === "string") {
      return m === val;
    }
    return true;
  }

  update(
    sub: Matcher | null,
    pre: Matcher | null,
    obj: Matcher | null,
    triple: Triple,
  ) {
    for (const [i, t] of this.data.entries()) {
      if (
        this.test(sub, t[0]) &&
        this.test(pre, t[1]) &&
        this.test(obj, t[2])
      ) {
        this.data[i] = triple;
      }
    }
  }

  match(sub: Matcher, pre?: Matcher, obj?: Matcher): Triples {
    return this.data.filter(
      ([itemSub, itemPre, itemObj]) =>
        this.test(sub, itemSub) &&
        this.test(pre, itemPre) &&
        this.test(obj, itemObj),
    );
  }

  query(
    clauses: Array<[Matcher, Matcher, Matcher]>,
  ): Array<Record<string, string>>;
  query(
    clauses: Array<[Matcher, Matcher, Matcher]>,
    options: { distinct: string },
  ): string[];
  query(
    clauses: Array<[Matcher, Matcher, Matcher]>,
    options: { distinct?: string } = {},
  ): Array<Record<string, string>> | string[] {
    let bindings: Array<Record<string, string>> | null = null;
    for (const clause of clauses) {
      const bpos: Record<string, number> = {};
      const qc: Array<Matcher> = [];
      clause.forEach((x, pos) => {
        if (typeof x === "string" && x.startsWith("?")) {
          qc.push(null);
          bpos[x.substring(1)] = pos;
        } else {
          qc.push(x);
        }
      });

      const rows = this.match(qc[0], qc[1], qc[2]);

      if (bindings == null) {
        bindings = [];
        for (const row of rows) {
          const binding: Record<string, string> = {};
          for (const [variable, pos] of Object.entries(bpos)) {
            binding[variable] = row[pos];
          }
          bindings.push(binding);
        }
      } else {
        const newb: Record<string, string>[] = [];
        for (const binding of bindings) {
          for (const row of rows) {
            let validmatch = true;
            const tempbinding: Record<string, string> = { ...binding };
            for (const [variable, pos] of Object.entries(bpos)) {
              if (variable in tempbinding) {
                if (tempbinding[variable] != row[pos]) {
                  validmatch = false;
                }
              } else {
                tempbinding[variable] = row[pos];
              }
            }
            if (validmatch) {
              newb.push(tempbinding);
            }
          }
        }
        bindings = newb;
      }
    }

    if (!bindings) return [];

    if (options.distinct) {
      const seen = new Set<string>();
      return bindings
        .map((b) => b[options.distinct!])
        .filter((v) => {
          if (seen.has(v)) return false;
          seen.add(v);
          return true;
        });
    }

    return bindings;
  }

  midiOutput: WebMidi.MIDIOutput | null = null;

  async initMidiOutput() {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      const outputs = Array.from(midiAccess.outputs.values());
      if (outputs.length > 0) {
        this.midiOutput = outputs[0];
        console.log("Connected to MIDI output:", this.midiOutput.name);
      } else {
        console.warn("No MIDI output devices found");
      }
    } catch (error) {
      console.error("Failed to initialize MIDI:", error);
    }
  }

  setMidiOutput(output: WebMidi.MIDIOutput | null) {
    this.midiOutput = output;
  }

  sendMidiNote(note: number, velocity: number, duration: number) {
    if (!this.midiOutput) {
      console.warn("No MIDI output device connected");
      return;
    }

    // Note on
    this.midiOutput.send([0x90, note, velocity]);

    // Note off after duration
    setTimeout(() => {
      this.midiOutput?.send([0x80, note, 0]);
    }, duration);
  }

  sendMidiControlChange(controller: number, value: number) {
    if (!this.midiOutput) {
      console.warn("No MIDI output device connected");
      return;
    }

    this.midiOutput.send([0xb0, controller, value]);
  }

  sendMidiProgramChange(program: number) {
    if (!this.midiOutput) {
      console.warn("No MIDI output device connected");
      return;
    }

    this.midiOutput.send([0xc0, program]);
  }
}
