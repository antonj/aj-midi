import { useSound } from "../util/useSound";
import { useKeyUp } from "../util/useKeyUp";
import { useState } from "react";
import { fontSizeVw } from "../util/text";

export function Type({ words }: { words: string[] }) {
  const audioCorrectChar = useSound("/static/audio/correct_char.wav");
  const audioIncorrectChar = useSound("/static/audio/incorrect_char.wav");
  const audioCorrectWord = useSound("/static/audio/correct_word.wav");
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

  return (
    <div className="root">
      <header
        style={{ fontSize: fontSizeVw(word) + "vw" }}
        className={facit.length === written.length ? "correct" : ""}
      >
        <h1>
          {Array.from(word).map((c, i) => (
            <span
              className={
                (index === i ? "currentChar" : "") + (c === " " ? " space" : "")
              }
              key={i}
            >
              {c}
            </span>
          ))}
        </h1>
        <h1>
          {Array.from(written).map((c, i) => (
            <span key={i}>{c}</span>
          ))}
          {word.charAt(index) === " " ? (
            <>
              <span> </span>
              <span className="nextChar">{word.charAt(index + 1)}</span>
            </>
          ) : (
            <span className="nextChar">{word.charAt(index)}</span>
          )}
        </h1>
      </header>
      <style jsx>{`
        .root {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          white-space: pre;
        }
        .currentChar,
        .space.currentChar + span {
          color: gold;
          animation: 700ms infinite currentChar;
        }
        .nextChar {
          opacity: 0.03;
        }
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
        h1 {
          margin: 0;
        }
        h1 span {
          display: inline-block;
        }
        header {
          position: relative;
        }
        h1 {
          text-transform: uppercase;
          font-family: sans-serif;
        }
        .correct h1 {
          transition: transform 1s cubic-bezier(0.87, -0.41, 0.19, 1.44);
          transform: translateY(50%);
        }
        .correct h1 + h1 {
          transform: translateY(-50%);
        }
      `}</style>
    </div>
  );
}
