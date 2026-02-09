import { useState, useEffect, useRef} from "react";
import { useParams } from 'react-router-dom';
import '../styles/StartRecipe.css';
import Canvas from "../assets/Canvas";


interface Recipe {
    name: string;
    steps: string[];
    ingredients: string[];
    amount: string[];
    portion: string;
}

interface Messages {
    sender: string;
    text: string;
}

interface Ingredients {
    name: string;
    image?: string; 
}

interface Tools {
    name: string;
    image?: string;
}

interface Actions {
    name: string; 
}

interface StepData {
    ingredients: Ingredients[];
    tools: Tools[];
    actions: Actions[];
}


const StartRecipe = () => {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [activeTab, setActiveTab] = useState("Recipe");
    const [activeBoardTab, setActiveBoardTab] = useState("Recipe tutorial");
    const [userMessage, setUserMessage] = useState("");
    const [messages, setMessages] = useState<Array<Messages>>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const container = useRef<HTMLDivElement>(null);
    const { name } = useParams<{name: string}>();
    const [glass, setGlass] = useState<boolean>(false);
    const [ingredientImages, setIngredientImages] = useState<Record<string, string>>({});
    const [activeTutTab, setActiveTutTab] = useState(0);
    const [stepIngredients, setStepIngredients] = useState<Array<Ingredients>>([]);
    const [stepTools, setStepTools] = useState<Array<Tools>>([]);
    const [stepActions, setStepActions] = useState<Array<Actions>>([]);
    const [stepData, setStepData] = useState<Record<number, StepData>>({});


    const stepSeparator = (step: string) => {

        fetch("http://localhost:8080/separate", {
            method: "POST",
            body: JSON.stringify({step}),
            headers: { "Content-Type": "application/json" }
        })
        
        .then(response => response.json())
        .then (data => {
            console.log(step);
            console.log("Ответ агента:", data);
            setStepIngredients(data.ingredients  || []);
            setStepTools(data.tools || []);
            setStepActions(data.actions || []);

            setStepData(prev => ({
                ...prev,
                [activeTutTab]: {
                    ingredients: data.ingredients || [],
                    tools: data.tools || [],
                    actions: data.actions || []
                }
            }));
        }) 
        .catch(error => console.error("Step separation error:", error));
    };

    useEffect (() => {
        if (!recipe) return;

        const stepText = recipe.steps[activeTutTab];

        if (stepData[activeTutTab]) {
            setStepIngredients(stepData[activeTutTab].ingredients);
            setStepTools(stepData[activeTutTab].tools);
            setStepActions(stepData[activeTutTab].actions);
        } else {
            stepSeparator(stepText);
        }
    }, [activeTutTab, recipe]);

    const handleTabClick = (tabName :string) => {
        if (tabName === "Recipe") {
            setActiveTab("Recipe");
        } else {
            setActiveTab("Chat");
        }
    };

    const handleBoardTabClick = (tabName :string) => {
        if (tabName === "Quizz") {
            setActiveBoardTab("Quizz");
        } else {
            setActiveBoardTab("Recipe tutorial");
        }
    };
    
    useEffect (() => {
        fetch('/recipes.json')
            .then(response => response.json())
            .then(recipe => setRecipe(recipe.find((r: Recipe) => r.name === name)))
            .catch(error => console.error('Error fetching data', error));
    }, [name]);

    const Scroll = () => {
        if (!container.current) return;
        
        const { offsetHeight, scrollHeight, scrollTop } = container.current as HTMLDivElement;
        if (scrollHeight <= scrollTop + offsetHeight + 100) {
            container.current?.scrollTo(0, scrollHeight);
        }
    }

    useEffect (() => {
        if (activeTab === "Chat"){
            Scroll();
        }
    }, [messages, activeTab]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setUserMessage(e.target.value);

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"; 
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"; 
        }
    }

    const handleSend = () => {
        if (!userMessage.trim() || !recipe) return;

        setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
        let updatedHistory = messages.map(msg => msg.text);
        const payload = {
            message: userMessage,
            context: {
                name: recipe.name,
                portion: recipe.portion,
                ingredients: recipe.ingredients,
                amount: recipe.amount,
                steps: recipe.steps,
                previous: updatedHistory
            }
        };
        console.log(payload)

        fetch("http://localhost:8080/send-message", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        })
            .then(response => response.json())
            .then(text => {
                let reply = text.reply;
                reply = reply.replace(/```json\s*([\s\S]*?)```/, '$1').trim();
                const jsonMatch = reply.match(/\{[\s\S]*\}$/);
                let explanation = reply;
                let updatedRecipe = null;

                if (jsonMatch) {
                    const jsonText = jsonMatch[0];
                    try {
                        updatedRecipe = JSON.parse(jsonText);
                        explanation = reply.replace(jsonText, "").trim();
                    } catch (err) {
                        console.log("Failed to parse JSON", err);
                    }
                }

                setMessages(prev => [...prev, { sender: "agent", text: explanation }]);

                if (updatedRecipe) {
                    setRecipe({
                        name: updatedRecipe.name,
                        portion: String(updatedRecipe.portion),
                        ingredients: updatedRecipe.ingredients.map((i: any) => i.name),
                        amount: updatedRecipe.ingredients.map((i: any) => `${i.amount} ${i.unit}`),
                        steps: updatedRecipe.steps
                    });
                }
            })
            .catch(error => console.error("Request error:", error));

        setUserMessage("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    const generateImage = async (ingredientName:string) => {
        if (ingredientImages[ingredientName]) return;

        try {
            const res = await fetch("http://localhost:8080/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredient: ingredientName })
            });

            const data = await res.json();
            const newImage = `data:image/png;base64,${data.image}`;
            
            setIngredientImages(prev => {
                const updated = {...prev, [ingredientName]: newImage};
                return updated;
            });
        } catch (err) {
            console.error("Image generation error:", err);
        }
    }

    useEffect(() => {
        if (!recipe) return;

        const run = async () => {
            await Promise.all(
                recipe.ingredients.map(ingredient => generateImage(ingredient))
            );
        };

        run();
    }, [recipe]);

    useEffect(() => {
        const savedImages = JSON.parse(localStorage.getItem("ingredientImages") || "{}");
        setIngredientImages(savedImages);
    }, []);

    const addToGlass = (ingredient: string) => {
        if (!glass) {
            alert("You must select a glass first");
        } else {
            const prompt = `${ingredient} in a glass`
            generateImage(prompt);
        }
    };

    return (
        <div className="game-container">
            <div className="board-container">
                <div className="board-card">
                    <div className="tab-title">
                        <h2 className={activeBoardTab==="Recipe tutorial"? "active-recipe-tab" : "inactive-tab"} onClick={() => handleBoardTabClick("Recipe tutorial")}>Recipe tutorial</h2>
                        <h2 className={activeBoardTab==="Quizz"? "active-quizz-tab" : "inactive-tab"} onClick={() => handleBoardTabClick("Quizz")}>Quizz</h2>
                    </div>
                    <div style={{width: "100%"}}>
                        { 
                        activeBoardTab === "Quizz"?
                            <>
                                <div className="icon-container">
                                    <div className="glass-icon">
                                        <button className="ingredient-button" onClick={() => setGlass(true)}>
                                            <img src="/public/glass1.png"></img>
                                        </button>
                                        <button className="ingredient-button">
                                            <img src="/public/glass2.png"></img>
                                        </button>
                                        <button className="ingredient-button">
                                            <img src="/public/glass2.png"></img>
                                        </button>
                                    </div>

                                    <div className="ingredients-icon">
                                        {recipe?.ingredients.map((ingredient) => {
                                            return (
                                                <button className="ingredient-button" key={ingredient} onClick={() => addToGlass(ingredient)}>
                                                    {ingredientImages[ingredient] ? (
                                                        <img src={ingredientImages[ingredient]} alt={ingredient} />
                                                        ) : (
                                                        <div className="loader"></div>
                                                    )}
                                                    <p>{ingredient}</p>
                                                </button>
                                            )
                                        })}
                                    </div>  

                                    <div className="center-glass">
                                        {glass? 
                                            <img src="/public/glass.png"></img> : <div></div>}
                                    </div>   
                                </div> 
                            </> :
                            <>
                                <div className="step-tabs">
                                    {recipe?.steps.map((step, index) => {
                                        return (
                                            <div className="tabs">
                                                <div key={index} className={activeTutTab === index? "active-tab" : "inactive-tab"} onClick={() => setActiveTutTab(index)}>
                                                    <h3>Step {index + 1}</h3>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="canvas">
                                    <h3>{recipe?.steps[activeTutTab]}</h3>
                                    <Canvas className="canvas-board"
                                        ingredients={stepIngredients}
                                        tools={stepTools}
                                        actions={stepActions}
                                    />
                                </div>
                            </>
                        }  
                    </div>
                </div>
            </div>

            <div className="recipe-container">
                <div className="recipe-card">
                    <div className="tab-title">
                        <h2 className={activeTab==="Recipe"? "active-recipe-tab" : "inactive-tab"} onClick={() => handleTabClick("Recipe")}>Recipe</h2>
                        <h2 className={activeTab==="Chat"? "active-chat-tab" : "inactive-tab"} onClick={() => handleTabClick("Chat")}>Chat</h2>
                    </div>
                    <div>
                        {
                        activeTab === "Recipe" ? 
                            <>
                                <h2>{name}</h2>

                                <div className="ingredient-list">
                                    <h3>Ingredients for {recipe? (Number(recipe.portion) === 1 ? `${recipe.portion} portion` : `${recipe.portion} portions`) : ''}</h3>
                                    {recipe && recipe.ingredients && recipe.amount && recipe.ingredients.map((ingredient, index) => (
                                        <p key={index}>{ingredient} - {recipe.amount[index]}</p>))}
                                </div>

                                <div className="step-list">
                                    <h3>Steps</h3>
                                    {recipe && recipe.steps && recipe.steps.map((step, index) => (
                                        <p key={index}>Step {index + 1}: {step}</p>))}
                                </div>
                            </> :
                            <>
                                <div className="messages-window" ref={container}>
                                    {messages.map((msg, index) => (
                                        <p 
                                            key={index} 
                                            className={msg.sender === "user" ? "user-message" : "agent-message"}
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
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault(); 
                                                handleSend();
                                            }
                                        }}
                                    />
                                    <button onClick={handleSend} className="button">↑</button>
                                </div>
                            </>
                        }
                    
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StartRecipe;
