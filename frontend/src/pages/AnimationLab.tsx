import { useState } from "react";
import { Link } from "react-router-dom";
import Canvas from "../components/Canvas";
import { animations } from "../components/animations";
import { ACTION_TYPES, cookingActions, type ActionCue, type CookingAction } from "../lib/cooking-actions";

const examples = [
  { name: "Whisk", text: "Whisk matcha powder with a small splash of hot water until smooth." },
  { name: "Sift", text: "Sift matcha powder into a bowl to remove any lumps." },
  { name: "Pour", text: "Slowly pour milk into the cup." },
  { name: "Sequence", text: "Sift matcha into a bowl, then pour in hot water and whisk until smooth." },
];
const label = (action: CookingAction) => action.charAt(0).toUpperCase() + action.slice(1).replace("-", " ");
const drawn = ACTION_TYPES.filter(action => animations[action]);
const pending = ACTION_TYPES.filter(action => !animations[action]);

export default function AnimationLab() {
  const [draft, setDraft] = useState(examples[0].text);
  const [instruction, setInstruction] = useState(draft);
  const [action, setAction] = useState<CookingAction | null>(null);
  const [color, setColor] = useState("#8d9d65");
  const [resultColor, setResultColor] = useState("#e9dfc5");
  const [version, setVersion] = useState(0);
  function preview(text: string) { setDraft(text); setInstruction(text); setAction(null); setVersion(v => v + 1); }
  function play(next: CookingAction) { setAction(next); setVersion(v => v + 1); }
  const cues: ActionCue[] = action ? [{ kind: action, context: action, color, resultColor }] : cookingActions(instruction);
  const shown = action ? animations[action]!.caption : instruction;
  return <main id="main" className="animation-lab">
    <Link to="/collection">← Back to recipes</Link>
    <h1>A little motion in the kitchen.</h1>
    <p>Choose an example or try your own instruction with whisk, sift, or pour.</p>
    <div className="lab-examples" role="group" aria-label="Example instructions">
      {examples.map(example => <button key={example.name} aria-pressed={!action && instruction === example.text}
        onClick={() => preview(example.text)}>{example.name}</button>)}
    </div>
    <form onSubmit={event => { event.preventDefault(); preview(draft); }}>
      <label htmlFor="animation-instruction">Your recipe step</label>
      <textarea id="animation-instruction" value={draft} maxLength={1000} required onChange={event => setDraft(event.target.value)} />
      <button type="submit">Preview step</button>
    </form>
    <section className="lab-actions" aria-labelledby="lab-actions-title">
      <h2 id="lab-actions-title">Every action</h2>
      <p>{drawn.length} of {ACTION_TYPES.length} actions are drawn. Play one directly, in any ingredient colour.</p>
      <div className="lab-examples" role="group" aria-label="Drawn actions">
        {drawn.map(item => <button key={item} aria-pressed={action === item} onClick={() => play(item)}>{label(item)}</button>)}
      </div>
      <div className="lab-colors">
        <label>Ingredient colour
          <input type="color" value={color} onChange={event => { setColor(event.target.value); setVersion(v => v + 1); }} /></label>
        <label>Result colour
          <input type="color" value={resultColor} onChange={event => { setResultColor(event.target.value); setVersion(v => v + 1); }} /></label>
      </div>
      {!!pending.length && <p className="lab-pending">Not drawn yet: {pending.map(label).join(", ")}.</p>}
    </section>
    <p className="lab-instruction">{shown}</p>
    {cues.length ? <Canvas key={version} instruction={shown} cues={action ? cues : undefined}
      visual={{ ingredients: [], tools: [], actions: cues.map(cue => cue.kind) }} /> :
      <p role="status">No supported action found. Try an instruction such as “Sift cocoa into a bowl.”</p>}
  </main>;
}
