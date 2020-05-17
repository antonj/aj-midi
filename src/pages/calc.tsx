import { Calc } from "../components/Calc";
import { useRouter } from "next/router";
import { useEffect } from "react";

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
  const router = useRouter();
  const first = qToNumber(router.query.f);
  const second = qToNumber(router.query.s);

  useEffect(() => {
    if (first == null || second == null) {
      router.replace(getNewRandomUrl());
    }
  }, [first, second]);

  return (
    <>
      <div>
        <Calc first={first} second={second} />
      </div>
      <style jsx global>
        {`
          html,
          body {
            height: 100%;
            min-height: 100%;
            margin: 0;
          }
          body {
            font-size: 10vw;
            width: 100%;
            height: 100%;
          }
        `}
      </style>
      <style jsx>{`
        div {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: stretch;
          padding: 0 5vw;
        }
      `}</style>
    </>
  );
}

CalcPage.getInitialProps = () => {
  // make sure query is not empty
  return {};
};
