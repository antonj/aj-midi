import { playDataURL, useSound } from "../util/useSound";
import { useKeyUp } from "../util/useKeyUp";
import { useEffect, useRef, useState } from "react";
import { fontSizeVw } from "../util/text";
import { RecordChar } from "./RecordChar";
import { css } from "@emotion/css";
import { useAudioContext, usePlaySavedSound } from "./audio-context";

export function Type({ words, record }: { words: string[]; record: boolean }) {
  const aCtx = useRef<AudioContext>();
  useEffect(() => {
    aCtx.current = new AudioContext();
  }, []);

  const charAudio = useAudioContext((state) => state.state);
  const audioCorrectChar = useSound(
    "/static/audio/correct_char.wav",
    aCtx.current
  );
  const audioIncorrectChar = useSound(
    "/static/audio/incorrect_char.wav",
    aCtx.current
  );
  const audioCorrectWord = useSound(
    "/static/audio/correct_word.wav",
    aCtx.current
  );

  const [indexWord, setIndexWord] = useState(0);
  const [written, setWritten] = useState("");
  const word = words[indexWord] || "";
  const facit = word.toUpperCase();

  const reset = () => {
    setIndexWord((index) => (index + 1) % words.length);
    setWritten("");
  };

  useKeyUp((ev) => {
    let key = ev.key;
    switch (key) {
      case "Backspace":
      case "Escape": {
        reset();
        return;
      }
    }
    if (key.length !== 1) {
      return;
    }
    key = key.toUpperCase();
    console.log(key, aCtx.current, charAudio);

    let index = written.length;
    let nextChar = facit[index];

    let correct = false;
    let outputChars = "";
    if (nextChar === key) {
      outputChars = key;
      correct = true;
    }
    if (nextChar === " ") {
      if (key === " ") {
        correct = true;
        outputChars = key;
      } else if (facit[index + 1] === key) {
        correct = true;
        outputChars = " " + key;
      }
    }

    if (correct) {
      audioCorrectChar();
      setTimeout(() => {}, 500);
      setWritten((written) => written + outputChars);
      if (written.length + outputChars.length === facit.length) {
        audioCorrectWord();
        setTimeout(reset, 3000);
      }
    } else {
      audioIncorrectChar();
    }
  });

  const index = written.length;
  const char =
    word.charAt(index) === " " ? word.charAt(index + 1) : word.charAt(index);

  usePlaySavedSound(char, 500, aCtx.current);
  usePlaySavedSound(facit, 1000, aCtx.current);

  return (
    <div>
      <header
        className={
          "uppercase " + (facit.length === written.length ? "correct" : "")
        }
      >
        <h1
          style={{ fontSize: fontSizeVw(word) + "vw" }}
          className="relative z-0"
        >
          {Array.from(word).map((c, i) => (
            <Char variant={i === index ? "active" : ""} key={i}>
              {c}
            </Char>
          ))}
        </h1>
        {record ? (
          <div
            style={{ fontSize: fontSizeVw(word) + "vw" }}
            className="relative z-10"
          >
            {Array.from(word).map((c, i) => (
              <span key={i} className="flex flex-col">
                <div className="h-0 opacity-0 pointer-events-none">{c}</div>
                <RecordChar key={char} char={c} />
              </span>
            ))}
          </div>
        ) : null}
        <h1
          style={{ fontSize: fontSizeVw(word) + "vw" }}
          className="relative z-0"
        >
          {Array.from(written).map((c, i) => (
            <Char key={i}>{c}</Char>
          ))}
          {word.charAt(index) === " " ? (
            <>
              <span> </span>
              <Char key={char} variant="next">
                {char}
              </Char>
            </>
          ) : (
            <Char key={char} variant="next">
              {char}
            </Char>
          )}
        </h1>
        {record ? <RecordChar key={facit} char={facit} /> : null}
      </header>
      <style>{`
        .correct h1 {
          transition: transform 1s cubic-bezier(0.87, -0.41, 0.19, 1.44);
          transform: translateY(50%);
        }
        .correct h1 ~ h1 {
          transform: translateY(-50%);
        }
      `}</style>
    </div>
  );
}

function Char(props: { children: string; variant?: "" | "active" | "next" }) {
  return (
    <span
      className={
        "relative inline-block " +
        css`
          font-size: 2em;
          font-weight: bold;
          line-height: 1;
          @keyframes currentChar {
            0% {
              transform: translateZ(0) scale(1);
            }
            50% {
              transform: translateZ(0) scale(1.05);
            }
            0% {
              transform: translateZ(0) scale(1);
            }
          }
          color: ${props.variant === "active" ? "gold" : "default"};
          animation: ${props.variant === "active"
            ? "700ms infinite currentChar"
            : "default"};
          opacity: ${props.variant === "next" ? "0.03" : "1"};
        `
      }
    >
      {props.children}
    </span>
  );
}
