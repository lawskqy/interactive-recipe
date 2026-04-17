interface Message {
    sender: string;
    text: string;
}

interface ChatViewProps {
    messages: Message[];
    userMessage: string;
    setUserMessage: (value: string) => void;
    handleSend: () => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const ChatView = ({
    messages,
    userMessage,
    setUserMessage,
    handleSend,
    textareaRef,
    containerRef,
    }: ChatViewProps) => {
        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setUserMessage(e.target.value);
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto"; 
                textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"; 
            }
        };
    return (
        <div className="chat-container">
            <div className="messages-window" ref={containerRef}>
                {messages.map((msg, index) => (
                <p
                    key={index}
                    className={
                        msg.sender === "user" ? "user-message" : "agent-message"
                    }
                >
                    {msg.text}
                </p>
                ))}
            </div>

            <div className="input-container">
                <textarea
                    ref={textareaRef}
                    value={userMessage}
                    onChange={handleChange}
                    className="chat-input"
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <button onClick={handleSend} className="button">
                ↑
                </button>
            </div>
        </div>
    );
};

export default ChatView;