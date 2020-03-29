import { FormEvent } from "react";

export function Create() {
  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const words = new FormData(ev.currentTarget)
      .get("words")
      .toString()
      .split("\n")
      .filter(Boolean);

    window.location.href = "/?" + words.map(w => "w=" + w).join("&");
  };
  return (
    <section>
      <h1>Words</h1>
      <form onSubmit={onSubmit}>
        <textarea autoFocus name="words"></textarea>
        <button>start</button>
      </form>
      <style jsx>{`
        h1 {
          margin: 0;
        }
        form,
        textarea,
        button {
          box-sizing: border-box;
          display: block;
          width: 100%;
        }
        textarea {
          min-height: 5rem;
        }
        button {
          margin-top: 1rem;
        }
      `}</style>
    </section>
  );
}
