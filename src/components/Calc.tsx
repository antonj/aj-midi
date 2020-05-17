import { fontSizeVw } from "../util/text";
import { useState, useEffect, useRef } from "react";
import { useSound } from "../util/useSound";
import { useKeyUp } from "../util/useKeyUp";
import { Numpad } from "./Numpad";
import { useRouter } from "next/router";
import { getNewRandomUrl } from "../pages/calc";

export function Calc({ first, second }: { first: number; second: number }) {
  const router = useRouter();
  const audioIncorrectChar = useSound("/static/audio/incorrect_char.wav");
  const audioCorrectWord = useSound("/static/audio/correct_word.wav");
  const [answer, setAnswer] = useState<number>(null);

  const facit = first + second;
  const correct = facit === answer;

  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement }>({});
  const reset = () => {
    setAnswer(null);
    router.replace(getNewRandomUrl()).then(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
  };

  const onSetAnswer = (a: number) => {
    setAnswer(a);
    if (a === facit) {
      audioCorrectWord();
    } else {
      audioIncorrectChar();
    }
  };

  useKeyUp(ev => {
    let key = ev.key;
    switch (key) {
      case "Backspace":
      case "Escape": {
        reset();
        return;
      }
    }

    const num = parseInt(key);
    if (!isNaN(num)) {
      onSetAnswer(parseInt(key));
    }
  });

  useEffect(() => {
    if (answer === null) {
      return;
    }
    const btnRef = buttonRefs.current[answer];
    if (btnRef) {
      btnRef.focus();
    }
    let timeout: NodeJS.Timeout;
    if (answer === facit) {
      timeout = setTimeout(reset, 2000);
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
      <header style={{ fontSize: fontSizeVw(question) * 2 + "vw" }}>
        {question}{" "}
        <span className="noanswer">{state === "incorrect" ? "≠" : "="}</span>{" "}
        <span className={state}>{answerStr}</span>
      </header>
      <form>
        <Numpad facit={facit} answer={answer} setAnswer={onSetAnswer} />
      </form>
      <style jsx>{`
        .root {
          font-family: helvetica neue, helvetica, sans-serif;
          text-align: center;
          width: 100%;
        }
        header {
          font-weight: bold;
          padding-bottom: 2rem;
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
      `}</style>
    </div>
  );
}
