import { Calc } from "../components/Calc";
import { useRouter } from "next/router";
import { useEffect } from "react";
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
export default function CalcPage() {
  const { query } = useRouter();
  const first = qToNumber(query.f);
  const second = qToNumber(query.s);

  const max = 9;
  console.log(query, first, second);
  if (first == null || second == null) {
    const first = Math.floor(rndBetween(0, max));
    const second = Math.floor(rndBetween(0, max - first));
    useEffect(() => {
      window.location.href = "/calc?f=" + first + "&s=" + second;
    }, []);
    return null;
  }

  return (
    <>
      <div>
        <Calc first={first} second={second} max={max} />
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
