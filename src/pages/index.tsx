import { Type } from "../components/Type";
import { useRouter } from "next/router";

export default function Page() {
  const { query } = useRouter();
  let words = Array.isArray(query.w) ? query.w : [query.w || ""];

  return (
    <div>
      <Type words={words} />
      <style jsx global>{`
        html,
        body {
          height: 100%;
          margin: 0;
        }
        body {
          font-size: 10vw;
        }
        div {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
