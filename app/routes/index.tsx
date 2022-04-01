import { useSearchParams } from "remix";
import { Type } from "~/components/Type";
import { AudioProvider } from "../components/audio-context";
import { Create } from "../components/Create";

export default function Index() {
  const [sp] = useSearchParams();
  const words = sp.getAll("w").filter(Boolean);
  return (
    <div>
      {words.length > 0 ? (
        <AudioProvider>
          <Type record={sp.get("record") === "true"} words={words} />
        </AudioProvider>
      ) : (
        <Create />
      )}
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
