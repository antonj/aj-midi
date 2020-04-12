import { fontSizeVw } from "../util/text";
import { useState, useEffect, useRef } from "react";
import { useSound } from "../util/useSound";
import { useKeyUp } from "../util/useKeyUp";

export function Calc({
  first,
  second,
  max,
}: {
  first: number;
  second: number;
  max: number;
}) {
  const audioIncorrectChar = useSound("/static/audio/incorrect_char.wav");
  const audioCorrectWord = useSound("/static/audio/correct_word.wav");
  const [answer, setAnswer] = useState<number>(null);

  const facit = first + second;
  const correct = facit === answer;

  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement }>({});
  const reset = () => {
    location.href = "/calc";
  };

  useKeyUp((ev) => {
    let key = ev.key;
    console.log(key);
    switch (key) {
      case "Backspace":
      case "Escape": {
        reset();
        return;
      }
    }

    const num = parseInt(key);
    if (!isNaN(num)) {
      setAnswer(parseInt(key));
    }
  });

  useEffect(() => {
    if (answer === null) {
      return;
    }
    const btnRef = buttonRefs.current[answer];
    console.log(buttonRefs.current);
    if (btnRef) {
      console.log(btnRef);
      btnRef.focus();
    }
    let timeout;
    if (answer === facit) {
      audioCorrectWord();
      timeout = setTimeout(reset, 2000);
    } else {
      audioIncorrectChar();
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [answer]);

  const question = first + " + " + second;

  const answerStr = answer != null ? answer : "?";

  const state =
    answer === null ? "noanswer" : correct ? "correct" : "incorrect";

  return (
    <div className="root">
      <header style={{ fontSize: fontSizeVw(question) + "vw" }}>
        {question} <span className="noanswer">=</span>{" "}
        <span className={state}>{answerStr}</span>
      </header>
      <form>
        {Array.from(Array(max + 1).keys()).map((a) => (
          <button
            ref={(el) => (buttonRefs.current[a] = el)}
            onClick={(e) => {
              e.preventDefault();
              setAnswer(a);
            }}
            key={a}
          >
            {a}
          </button>
        ))}
      </form>
      <style jsx>{`
        .root {
          font-family: helvetica neue, helvetica, sans-serif;
          text-align: center;
          width: 100%;
        }
        header {
          font-weight: bold;
        }
        .noanswer {
          color: LIGHTSLATEGRAY;
        }
        .correct {
          color: MEDIUMSEAGREEN;
        }
        .incorrect {
          color: CRIMSON;
        }
        form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          grid-gap: 0.5rem;
        }
        button {
          font-size: 2rem;
          padding: 1rem;
          background: black;
          color: white;
          border: 0px solid gold;
          border-radius: 0.25rem;
        }
        button:focus {
          box-shadow: 0 0 0 1px white, 0 0 0 6px LIGHTCORAL;
          outline: none;
        }
      `}</style>
    </div>
  );
}
