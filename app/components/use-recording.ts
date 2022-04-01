import { useEffect, useRef, useState } from "react";

export function useRecording({
  variant,
}: {
  variant: "filereader" | "objecturl";
}) {
  const [state, setState] = useState<
    | { state: "" }
    | { state: "recording" }
    | { state: "stop_requested" }
    | { state: "done"; src: string }
  >({ state: "" });
  const mRef = useRef<MediaRecorder>();
  const start = () => {
    if (state.state !== "") {
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      setState({ state: "recording" });
      const mediaRecorder = new MediaRecorder(stream);
      mRef.current = mediaRecorder;
      const blobs: Array<Blob> = [];
      mediaRecorder.addEventListener("dataavailable", (event) => {
        blobs.push(event.data);
      });
      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(blobs, { type: blobs[0].type });
        switch (variant) {
          case "filereader": {
            const fr = new FileReader();
            const fail = () => {
              setState({ state: "" });
            };
            fr.onabort = fail;
            fr.onerror = fail;
            fr.onload = (ev) => {
              const src = ev.target?.result;
              if (typeof src !== "string") {
                fail();
                return;
              }
              setState({ state: "done", src });
              console.log("url", URL.createObjectURL(audioBlob));
              console.log("red", src);
            };
            fr.readAsDataURL(audioBlob);
            break;
          }
          case "objecturl": {
            setState({ state: "done", src: URL.createObjectURL(audioBlob) });
            break;
          }
        }
        for (const t of stream.getTracks()) {
          t.stop();
        }
      });
      mediaRecorder.start();
    });
  };

  useEffect(() => {
    return () => {
      if (mRef.current) {
        mRef.current.stop();
      }
    };
  }, []);

  const stop = () => {
    if (state.state !== "recording") {
      return;
    }
    if (!mRef.current) {
      return;
    }
    setState({ state: "stop_requested" });
    mRef.current.stop();
  };

  const reset = () => {
    if (state.state !== "done") {
      return;
    }
    setState({ state: "" });
  };

  return {
    state,
    start,
    stop,
    reset,
  };
}
