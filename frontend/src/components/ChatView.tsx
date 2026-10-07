import { useEffect, useRef } from "react";
import type { Message, Recipe } from "../lib/recipe";
interface Props {
  messages: Message[];
  value: string;
  onChange: (value: string) => void;
  onSend: (value?: string) => void;
  proposal: Recipe | null;
  onApprove: () => void;
  onDiscard: () => void;
  onViewRecipe: () => void;
  updated: boolean;
  availability: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
  active: boolean;
}
export default function ChatView({
  messages,
  value,
  onChange,
  onSend,
  loading,
  error,
  onRetry,
  active,
  proposal,
  onApprove,
  onDiscard,
  onViewRecipe,
  updated,
  availability,
}: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    if (active && follow.current && windowRef.current)
      windowRef.current.scrollTop = windowRef.current.scrollHeight;
  }, [messages, loading, active, proposal]);
  return (
    <div className="chat-panel">
      <div className="chat-intro">
        <p className="eyebrow">A LITTLE HELP ALONG THE WAY</p>
        <h2>Your café companion</h2>
        <p>Make this recipe your own, or ask about any step.</p>
        <p>{availability}</p>
        <p>Sending shares this recipe, your message and recent conversation with Google Gemini. Conversation history is also saved in this browser.</p>
        <p>Ask for a change here. I’ll show you the proposal and wait for your yes before updating the recipe.</p>
      </div>
      <div
        className="messages-window"
        role="log"
        aria-label="Conversation"
        ref={windowRef}
        onScroll={() => {
          const el = windowRef.current;
          if (el)
            follow.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {messages.length === 0 && (
          <div className="chat-suggestions">
            {[
              "Make it dairy-free",
              "Adjust to 2 servings",
              "Explain the first step",
            ].map((text) => (
              <button
                key={text}
                disabled={loading}
                onClick={() => onSend(text)}
              >
                {text} <span aria-hidden="true">✧</span>
              </button>
            ))}
          </div>
        )}
        {messages.map((message, index) => (
          <div className={`message ${message.sender}`} key={index}>
            <span className="message-author">
              {message.sender === "user" ? "You" : "Café companion"}
            </span>
            <p>{message.text}</p>
          </div>
        ))}
        {proposal && <section className="proposal chat-proposal" aria-label="Approve recipe changes">
          <h3>Apply these changes to your recipe?</h3>
          <p>Your recipe stays unchanged until you click Yes or type “yes”.</p>
          <details>
            <summary>Review proposed ingredients and steps</summary>
            <h4>{proposal.name} · {proposal.portion} servings · {proposal.category}</h4>
            <p>{proposal.description}</p>
            <ul>{proposal.ingredients.map((item, i) => <li key={i}>{item.name}: {item.amount}</li>)}</ul>
            <ol>{proposal.steps.map((item, i) => <li key={i}>{item}</li>)}</ol>
          </details>
          <div className="approval-actions">
            <button className="primary-button" disabled={loading} onClick={onApprove}>Yes, apply changes</button>
            <button disabled={loading} onClick={onDiscard}>No, keep my recipe</button>
          </div>
        </section>}
        {loading && (
          <p className="chat-loading" role="status">
            Preparing a reply…
          </p>
        )}
      </div>
      {updated && <button className="text-button" onClick={onViewRecipe}>View updated recipe</button>}
      {error && (
        <div className="notice" role="alert">
          {error}
          <button disabled={loading} onClick={onRetry}>
            Retry message
          </button>
        </div>
      )}
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          follow.current = true;
          onSend();
        }}
      >
        <label className="sr-only" htmlFor="chat-message">
          Message your café companion
        </label>
        <textarea
          id="chat-message"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="A question, a swap, a little inspiration…"
          rows={3}
          maxLength={4000}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              follow.current = true;
              onSend();
            }
          }}
        />
        <button
          className="primary-button"
          disabled={loading || !value.trim()}
          aria-label="Send message"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
