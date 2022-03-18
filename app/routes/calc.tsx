import { Calc } from "../components/Calc";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "remix";

const MAX = 9;

function rndBetween(min: number, max: number) {
  return Math.random() * max - min;
}

function qToNumber(q: string | string[]) {
  let str = Array.isArray(q) ? q[0] : q;
  if (!str) {
    return null;
  }
  return parseInt(str);
}

export function getNewRandomUrl() {
  const first = Math.round(rndBetween(0, MAX));
  const second = Math.round(rndBetween(0, MAX - first));
  return "/calc?f=" + first + "&s=" + second;
}

export default function CalcPage() {
  let navigate = useNavigate();
  const [sp] = useSearchParams();
  const first = qToNumber(sp.getAll("f"));
  const second = qToNumber(sp.getAll("s"));

  useEffect(() => {
    if (first == null || second == null) {
      navigate(getNewRandomUrl(), { replace: true });
    }
  }, [first, second, navigate]);

  return (
    <>
      <div>
        <Calc first={first} second={second} />
      </div>
      <style>
        {`
          html,
          body {
            margin: 0;
          }
          body {
            font-size: 10vw;
          }
        `}
      </style>
      <style>{`
        div {
          min-height: 100vh;
          min-height: -webkit-fill-available;
          display: flex;
          align-items: center;
          justify-content: stretch;
          padding: 0 5vw;
        }
      `}</style>
    </>
  );
}
