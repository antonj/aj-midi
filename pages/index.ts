/*global Audio */
import { Component, Fragment, useEffect } from "react";

import { withRouter } from "next/router";
import Link from "next/link";
import { fitText } from "../lib/fittext";

class Elma extends Component {
  state = {
    onlyUpperCase: true,
    onlyChars: true,
    facit: "",
    mission: [],
    text: "",
    char: ""
  };
  lastKey = null;

  static getDerivedStateFromProps(props, state) {
    return {
      ...state,
      text: props.facit !== state.facit ? "" : state.text,
      facit: props.facit || ""
    };
  }

  componentDidMount() {
    document.addEventListener("keyup", this.onKeyUp);
    this.audioCorrectChar = new Audio("/static/audio/correct_char.wav");
    this.audioInCorrectChar = new Audio("/static/audio/incorrect_char.wav");
    this.audioCorrectWord = new Audio("/static/audio/correct_word.wav");
  }

  componentWillUnmount() {
    document.removeEventListener("keyup", this.onKeyUp);
  }

  onKeyUp = ev => {
    console.log(ev.key);
    let key = ev.key;
    switch (key) {
      case "Backspace":
      case "Escape": {
        this.setState({ text: "" });
        return;
      }
    }

    if (key.length !== 1) {
      return;
    }
    let { text, facit, onlyChars, onlyUpperCase } = this.state;
    if (onlyChars) {
      facit = facit.replace(/[.,-]/g, "");
      text = text.replace(/[.,-]/g, "");
    }
    if (onlyUpperCase) {
      facit = facit.toUpperCase();
      text = text.toUpperCase();
      key = key.toUpperCase();
    }

    let index = text.length;
    let nextChar = facit[index];
    if (nextChar === key) {
      this.audioCorrectChar.cloneNode().play();
      this.setState({ text: text + key });
      if (text.length + 1 === facit.length) {
        this.audioCorrectWord.play();
      }
    } else {
      this.audioInCorrectChar.play();
    }
  };

  render() {
    const { mission } = this.props;
    const fontSizeVw = Math.min(10, 60 / this.state.facit.length);
    const index = this.state.text.length;

    // useEffect(() => {
    //   console.log("useEffect");
    //   return () => {
    //     console.log("clean");
    //   };
    // });

    return (
      <div className="root">
        {/* <nav>
          {mission.map((m, i) => (
            <Link key={i} href={`?w=${m}`}>
              <a>{m}</a>
            </Link>
          ))}
        </nav> */}
        <header
          style={{ fontSize: fontSizeVw + "vw" }}
          className={
            this.state.facit.length === this.state.text.length ? "correct" : ""
          }
        >
          <h1>
            {Array.from(this.state.facit).map((c, i) => (
              <span className={index === i ? "currentChar" : ""} key={i}>
                {c}
              </span>
            ))}
          </h1>
          <h1>
            {Array.from(this.state.text).map((c, i) => (
              <span key={i}>{c}</span>
            ))}
            <span className="nextChar">{this.state.facit.charAt(index)}</span>
          </h1>
        </header>
        <style jsx>{`
          .root {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
          }
          .currentChar {
            color: gold;
            animation: 700ms infinite currentChar;
          }
          .nextChar {
            opacity: 0.03;
          }
          .currentChar ~ span {
          }
          @keyframes currentChar {
            0% {
              transform: translateZ(0) scale(1);
            }
            50% {
              transform: translateZ(0) scale(1.05);
            }
            0% {
              transform: translateZ(0) scale(1);
            }
          }
          h1 {
            margin: 0;
          }
          h1 span {
            display: inline-block;
          }
          header {
            position: relative;
          }
          h1 {
            text-transform: uppercase;
            font-family: sans-serif;
          }
          .correct h1 {
            transition: transform 1s cubic-bezier(0.87, -0.41, 0.19, 1.44);
            transform: translateY(50%);
          }
          .correct h1 + h1 {
            transform: translateY(-50%);
          }
        `}</style>
      </div>
    );
  }
}

export default withRouter(({ router }) => (
  <Fragment>
    <Elma
      facit={[].concat(router.query.w)[0]}
      mission={[].concat(router.query.w)}
    />
    <style jsx global>{`
      html,
      body {
        min-height: 100%;
      }
      body {
        font-size: 10vw;
      }
    `}</style>
  </Fragment>
));
