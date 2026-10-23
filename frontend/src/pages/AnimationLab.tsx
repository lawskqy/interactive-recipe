import { useState } from "react";
import { Link } from "react-router-dom";
import Canvas from "../components/Canvas";
import { cookingActions } from "../lib/cooking-actions";

const examples = [
  { name: "Whisk", text: "Whisk matcha powder with a small splash of hot water until smooth." },
  { name: "Sift", text: "Sift matcha powder into a bowl to remove any lumps." },
  { name: "Pour", text: "Slowly pour milk into the cup." },
  { name: "Sequence", text: "Sift matcha into a bowl, then pour in hot water and whisk until smooth." },
];
export default function AnimationLab() {
  const [draft, setDraft] = useState(examples[0].text);
  const [instruction, setInstruction] = useState(draft);
  const [version, setVersion] = useState(0);
  function preview(text: string) { setDraft(text); setInstruction(text); setVersion(v => v + 1); }
  const cues = cookingActions(instruction);
  return <main id="main" className="animation-lab">
    <Link to="/collection">← Back to recipes</Link>
    <h1>A little motion in the kitchen.</h1>
    <p>Three gestures, one step at a time. Choose an example or try your own instruction with whisk, sift, or pour.</p>
    <div className="lab-examples" role="group" aria-label="Example instructions">
      {examples.map(example => <button key={example.name} aria-pressed={instruction === example.text}
        onClick={() => preview(example.text)}>{example.name}</button>)}
    </div>
    <form onSubmit={event => { event.preventDefault(); preview(draft); }}>
      <label htmlFor="animation-instruction">Your recipe step</label>
      <textarea id="animation-instruction" value={draft} maxLength={1000} required onChange={event => setDraft(event.target.value)} />
      <button type="submit">Preview step</button>
    </form>
    <p className="lab-instruction">{instruction}</p>
    {cues.length ? <Canvas key={version} instruction={instruction}
      visual={{ ingredients: [], tools: [], actions: cues.map(cue => cue.kind) }} /> :
      <p role="status">No supported action found. Try an instruction such as “Sift cocoa into a bowl.”</p>}
  </main>;
}
