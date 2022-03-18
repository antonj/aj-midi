import { useSearchParams } from "remix";
import { Create } from "../components/Create";
import { Type } from "../components/Type";

export default function Index() {
  const [sp] = useSearchParams();
  const words = sp.getAll("w").filter(Boolean);
  return (
    <div>
      {words.length === 0 ? <Create /> : <Type words={words} />}
      <style>{`
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
