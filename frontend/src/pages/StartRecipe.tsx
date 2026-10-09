import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { readSession, writeSession } from "../lib/session";
import {
  isRecipe,
  loadRecipes,
  type Message,
  type Recipe,
} from "../lib/recipe";
import RecipeView from "../components/RecipeView";
import ChatView from "../components/ChatView";
import TutorialBoard from "../components/TutorialBoard";
import "../styles/StartRecipe.css";
export default function StartRecipe() {
  const { name } = useParams();
  const location = useLocation();
  const collection = typeof location.state?.collection === "string" && location.state.collection.startsWith("/collection?") ? location.state.collection : "/collection";
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [revision, setRevision] = useState(0);
  const [previous, setPrevious] = useState<Recipe | null>(null);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState("recipe");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastMessage, setLastMessage] = useState("");
  const [proposal, setProposal] = useState<Recipe | null>(null);
  const pending = useRef<Recipe | null>(null);
  const lastPending = useRef<Recipe | null>(null);
  const updateProposal = (next: Recipe | null) => {
    pending.current = next;
    setProposal(next);
  };
  const [checked, setChecked] = useState<number[]>([]);
  const [completed, setCompleted] = useState<number[]>([]);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    const abort = new AbortController();
    api<{ aiConfigured: boolean }>("health", undefined, abort.signal)
      .then((health) => console.debug("[Assistant] Configuration status (provider availability is checked on request):", health))
      .catch((error) => { if (!abort.signal.aborted) console.warn("[Assistant] Health check failed:", error); });
    return () => abort.abort();
  }, []);
  const controller = useRef<AbortController | null>(null);
  const sending = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    loadRecipes(abort.signal)
      .then((data) => {
        const found = data.find((r) => r.id === name || r.name === name);
        if (!found) throw new Error("This recipe could not be found.");
        const session = readSession(found.id);
        setRecipe(session?.recipe || found);
        setPrevious(session?.previous || null);
        setStep(session?.step || 0);
        setChecked(session?.checked || []);
        setCompleted(session?.completed || []);
        setMessages(session?.messages || []);
        setDraft(session?.draft || "");
        updateProposal(session?.proposal || null);
        setStatus("ready");
      })
      .catch((err) => {
        if (!abort.signal.aborted) setStatus(err.message);
      });
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, [name, attempt]);
  useEffect(() => {
    if (recipe) setSaved(writeSession({ recipe, previous, step, checked, completed, messages, draft, proposal }));
  }, [recipe, previous, step, checked, completed, messages, draft, proposal]);
  const applyRecipe = (next: Recipe) => {
    setRecipe(next);
    setStep(0);
    setChecked([]);
    setCompleted([]);
    setRevision((r) => r + 1);
    updateProposal(null);
  };
  function approve(text = "Yes, apply changes.") {
    if (!recipe || !pending.current || sending.current) return;
    const next = pending.current;
    setPrevious(recipe);
    applyRecipe(next);
    setDraft("");
    setError("");
    setMessages((old) => [...old,
      { sender: "user", text },
      { sender: "agent", text: "Done — your recipe and tutorial are updated. Open The recipe to see the ingredients and method. You can undo this change above." },
    ]);
  }
  function discard(text = "No, keep my recipe.") {
    if (!pending.current || sending.current) return;
    updateProposal(null);
    setDraft("");
    setError("");
    setMessages((old) => [...old, { sender: "user", text }, { sender: "agent", text: "Kept your recipe unchanged." }]);
  }
  async function send(text = draft, retry = false) {
    if (!recipe || !text.trim() || sending.current) return;
    const answer = text.trim().toLowerCase().replace(/[.!?,]+$/g, "").trim();
    if (!retry && pending.current) {
      if (/^(yes|yes please|yes apply changes|yes apply it|yep|yeah|sure|ok|okay|apply|apply changes|confirm|go ahead|do it)$/.test(answer)) { approve(text); return; }
      if (/^(no|no thanks|no thank you|no keep my recipe|cancel|discard|discard changes|keep my recipe)$/.test(answer)) { discard(text); return; }
    }
    const pendingRecipe = retry ? lastPending.current : pending.current;
    lastPending.current = pendingRecipe;
    sending.current = true;
    setLoading(true);
    setError("");
    setLastMessage(text);
    updateProposal(null);
    if (!retry) {
      setMessages((old) => [...old, { sender: "user", text }]);
      setDraft("");
    }
    controller.current = new AbortController();
    try {
      const history = retry ? messages.slice(0, -1) : messages;
      const response = await api<{ reply: string; recipe: unknown }>(
        "send-message",
        {
          message: text,
          mode: "chat",
          pendingRecipe,
          context: recipe,
          previous: history
            .slice(-10)
            .map((item) => ({ ...item, text: item.text.slice(0, 4000) })),
        },
        controller.current.signal,
      );
      if (typeof response.reply !== "string" || !response.reply.trim())
        throw new Error("The assistant returned an empty reply. Please retry.");
      if (response.recipe !== null && response.recipe !== undefined) {
        if (!isRecipe(response.recipe))
          throw new Error(
            "The suggested recipe was incomplete. Your current recipe has been kept.",
          );
        updateProposal({ ...response.recipe, id: recipe.id, image: recipe.image });
      }
      setMessages((old) => [...old, { sender: "agent", text: response.reply }]);
    } catch (err) {
      if (!controller.current.signal.aborted)
        setError(
          err instanceof Error ? err.message : "Unable to send this message.",
        );
    } finally {
      sending.current = false;
      if (!controller.current.signal.aborted) setLoading(false);
    }
  }
  if (!recipe)
    return (
      <main id="main" className="empty-state">
        <Link to="/collection">← Back to the collection</Link>
        <h1>{status === "loading" ? "Opening your recipe…" : status}</h1>
        {status !== "loading" && (
          <button
            onClick={() => {
              setStatus("loading");
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        )}
      </main>
    );
  return (
    <div className="cooking-page">
      <header className="site-header">
        <Link className="wordmark" to="/">
          <img src="/favicon.svg" width="28" height="28" alt="" />
          <span>The Quiet Cup</span>
        </Link>
        <Link className="back-link" to={collection}>
          ← All recipes
        </Link>
      </header>
      <main id="main" className="cooking-main">
        <div className="cooking-heading">
          <div>
            <p className="eyebrow">A MOMENT TO MAKE</p>
            <h1>{recipe.name}</h1>
          </div>
          <span className="recipe-summary">
            {recipe.category === "warm drinks"
              ? "A warm ritual"
              : "A refreshing ritual"}{" "}
            · {recipe.steps.length} steps
          </span>
        </div>
        {previous && (
          <div className="update-notice" role="status">
            Your recipe has been updated.
            <button
              disabled={loading}
              onClick={() => {
                applyRecipe(previous);
                setPrevious(null);
                setMessages((old) => [
                  ...old,
                  {
                    sender: "agent",
                    text: "Your previous recipe has been restored.",
                  },
                ]);
              }}
            >
              Undo change
            </button>
          </div>
        )}
        {!saved && <p className="save-status" role="status">Your progress couldn’t be saved. Changes will be lost when you leave.</p>}
        <nav className="workspace-links" aria-label="Preparation sections">
          <button onClick={() => { setTab("recipe"); document.getElementById("recipe-tab")?.focus(); }}>Ingredients & method</button>
          <button onClick={() => document.querySelector<HTMLElement>(".current-instruction")?.focus()}>Current step</button>
          <button onClick={() => { setStep(0); setChecked([]); setCompleted([]); }}>Restart preparation</button>
        </nav>
        <div className="cooking-layout">
          <TutorialBoard
            key={revision}
            recipe={recipe}
            activeStep={step}
            onStep={setStep}
            completed={completed}
            onComplete={() => setCompleted((old) => old.includes(step) ? old.filter((n) => n !== step) : [...old, step])}
          />
          <section className="journal-panel" aria-label="Recipe and assistant">
            <div
              className="panel-tabs"
              role="tablist"
              aria-label="Recipe details"
            >
              {["recipe", "chat"].map((value) => (
                <button
                  id={value + "-tab"}
                  key={value}
                  role="tab"
                  aria-selected={tab === value}
                  aria-controls={value + "-panel"}
                  tabIndex={tab === value ? 0 : -1}
                  onClick={() => setTab(value)}
                  onKeyDown={(e) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                    ) {
                      e.preventDefault();
                      const next =
                        e.key === "Home"
                          ? "recipe"
                          : e.key === "End"
                            ? "chat"
                            : tab === "recipe"
                              ? "chat"
                              : "recipe";
                      setTab(next);
                      document.getElementById(next + "-tab")?.focus();
                    }
                  }}
                >
                  {value === "recipe" ? "The recipe" : "Ask the companion"}
                </button>
              ))}
            </div>
            <div
              id="recipe-panel"
              role="tabpanel"
              aria-labelledby="recipe-tab"
              hidden={tab !== "recipe"}
            >
              <RecipeView
                key={revision}
                recipe={recipe}
                activeStep={step}
                onStep={setStep}
                checked={checked}
                onCheck={(index) => setChecked((old) => old.includes(index) ? old.filter((n) => n !== index) : [...old, index])}
              />
            </div>
            <div
              id="chat-panel"
              role="tabpanel"
              aria-labelledby="chat-tab"
              hidden={tab !== "chat"}
            >
              <ChatView
                active={tab === "chat"}
                messages={messages}
                value={draft}
                onChange={setDraft}
                onSend={(text) => void send(text)}
                proposal={proposal}
                onApprove={() => approve()}
                onDiscard={() => discard()}
                onViewRecipe={() => { setTab("recipe"); document.getElementById("recipe-tab")?.focus(); }}
                updated={!!previous}
                loading={loading}
                error={error}
                onRetry={() => void send(lastMessage, true)}
              />
            </div>
          </section>
        </div>
      </main>
      <footer className="site-footer">
        Good things take a little stirring.
      </footer>
    </div>
  );
}
