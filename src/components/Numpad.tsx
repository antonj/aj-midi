import { useRef, useEffect } from "react";

export function Numpad({
  facit,
  answer,
  setAnswer,
}: {
  facit: number;
  answer: number;
  setAnswer: (a: number) => void;
}) {
  const layout: Array<number> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement }>({});
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
  }, [answer]);

  return (
    <div>
      {layout.map((a) => (
        <button
          className={answer === facit ? "correct" : "incorrect"}
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

      <style jsx>{`
        div {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          margin: -0.25rem;
        }
        button {
          width: calc(33.3333% - 0.5rem);
          margin: 0.25rem;
          font-size: 2rem;
          padding: 1rem;
          background: black;
          color: white;
          border: 0px solid gold;
          border-radius: 0.25rem;
        }
        @media (min-width: 376px) {
          button {
            width: auto;
            order: 2;
          }
          button:last-child {
            order: 1;
          }
        }
        .correct:focus {
          box-shadow: 0 0 0 1px white, 0 0 0 6px MEDIUMSEAGREEN;
          outline: none;
        }
        .incorrect:focus {
          box-shadow: 0 0 0 1px white, 0 0 0 6px LIGHTCORAL;
          outline: none;
        }
      `}</style>
    </div>
  );
}
