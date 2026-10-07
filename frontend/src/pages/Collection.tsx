import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loadRecipes, type Recipe } from "../lib/recipe";
import RecipeCover from "../components/RecipeCover";
import "../styles/Collection.css";
export default function Collection() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [params, setParams] = useSearchParams();
  const category = params.get("temperature") || "all";
  const query = params.get("q") || "";
  const setFilter = (key: string, value: string) => {
    setParams((old) => { const next = new URLSearchParams(old); if (value && value !== "all") next.set(key, value); else next.delete(key); return next; }, { replace: true });
  };
  const [selected, setSelected] = useState<Recipe | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const controller = new AbortController();
    loadRecipes(controller.signal)
      .then((data) => {
        setRecipes(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (!controller.signal.aborted) setStatus(error.message);
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (!selected) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      trigger.current?.focus();
    };
  }, [selected]);
  const filtered = recipes.filter(
    (r) =>
      (category === "all" || r.category === category) &&
      `${r.name} ${r.ingredients.map((i) => i.name).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase().trim().replace(/\s+/g, " ")),
  );
  const close = () => {
    dialog.current?.close();
    setSelected(null);
  };
  return (
    <div className="collection-page">
      <header className="site-header">
        <Link className="wordmark" to="/">
          <img src="/favicon.svg" width="28" height="28" alt="" />
          <span>The Quiet Cup</span>
        </Link>
        <span className="header-note">A little ritual, made by you.</span>
      </header>
      <main id="main" className="collection-main">
        <div className="collection-intro">
          <p className="eyebrow">THE CAFÉ JOURNAL</p>
          <h1>
            Find your moment
            <br />
            <em>in a cup.</em>
          </h1>
          <p>
            Slow mornings, sweet afternoons, and something lovely to make.
            <br className="desktop-break" /> Explore our collection, one recipe
            at a time.
          </p>
          <span className="intro-flourish" aria-hidden="true">
            ✧
          </span>
        </div>
        <div className="collection-toolbar">
          <div className="filter-group" aria-label="Filter by temperature">
            {[
              ["all", "All recipes"],
              ["warm drinks", "Warm"],
              ["cold drinks", "Cold"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={category === value}
                onClick={() => setFilter("temperature", value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Search recipes or ingredients</span>
            <input
              type="search"
              placeholder="Find a recipe or ingredient…"
              value={query}
              onChange={(e) => setFilter("q", e.target.value)}
            />
          </label>
        </div>
        <p className="collection-count" aria-live="polite">
          {status === "ready"
            ? `${filtered.length} recipes to savor`
            : status === "loading"
              ? "Opening the journal…"
              : ""}
        </p>
        {status !== "ready" && status !== "loading" && (
          <div className="notice" role="alert">
            {status}{" "}
            <button
              onClick={() => {
                setStatus("loading");
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}
        <div className="recipe-grid">
          {filtered.map((r, index) => (
            <button
              className="recipe-tile"
              key={r.id}
              onClick={(e) => {
                trigger.current = e.currentTarget;
                setSelected(r);
              }}
            >
              <div className="tile-art">
                <RecipeCover
                  recipe={r}
                  loading={index < 4 ? "eager" : "lazy"}
                />
                <span className="temperature-badge">
                  {r.category === "warm drinks" ? "Warm" : "Cold"}{r.ingredients.some((i) => /whisk(?:e)?y|rum|liqueur/i.test(i.name)) ? " · Contains alcohol" : ""}
                </span>
              </div>
              <div className="tile-copy">
                <h2>{r.name}</h2>
                <p>
                  {r.ingredients.length} ingredients <span>·</span>{" "}
                  {r.steps.length} steps{" "}
                  <span className="tile-arrow" aria-hidden="true">
                    ↗
                  </span>
                </p>
              </div>
            </button>
          ))}
        </div>
        {status === "ready" && filtered.length === 0 && (
          <div className="empty-state">
            <h2>No cups found just yet.</h2>
            <p>Try another ingredient or explore the full collection.</p>
            <button
              onClick={() => {
                setParams({});
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </main>
      <footer className="site-footer">
        Made for the joy of making. <span aria-hidden="true">✧</span> Take your
        time.
      </footer>
      <dialog
        ref={dialog}
        className="recipe-dialog"
        aria-labelledby="preview-title"
        onCancel={close}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {selected && (
          <div className="preview-content">
            <RecipeCover
              key={selected.id}
              recipe={selected}
              alt={selected.name}
            />
            <div className="preview-copy">
              <button
                className="dialog-close"
                onClick={close}
                aria-label="Close recipe preview"
              >
                ×
              </button>
              <p className="eyebrow">YOUR NEXT LITTLE RITUAL</p>
              <h2 id="preview-title">{selected.name}</h2>
              <p>{selected.description}</p>
              <div className="preview-meta">
                {selected.category === "warm drinks"
                  ? "Served warm"
                  : "Served cold"}{" "}
                · {selected.steps.length} steps · {selected.portion} serving
              </div>
              <button
                className="primary-button"
                onClick={() => navigate(`/start/${selected.id}`, { state: { collection: `/collection?${params.toString()}` } })}
              >
                Let’s make it <span aria-hidden="true">✧</span>
              </button>
              <button className="text-button" onClick={close}>
                Keep browsing
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
