import { useState, useEffect, useRef } from "react";
import { useParams } from 'react-router-dom';
import '../styles/StartRecipe.css';
import Canvas from "../assets/Canvas";
import { useNavigate } from "react-router-dom";


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

interface StepData {
    ingredients: string[];
    tools: string[];
    actions: string[];
    creates: string[];
}


const StartRecipe = () => {
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [activeTab, setActiveTab] = useState("Recipe");
    const [activeBoardTab, setActiveBoardTab] = useState("Recipe tutorial");
    const [userMessage, setUserMessage] = useState("");
    const [messages, setMessages] = useState<Array<Messages>>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const container = useRef<HTMLDivElement>(null);
    const { name } = useParams<{name: string}>();
    const [ingredientImages, setIngredientImages] = useState<Record<string, string>>(() => {
        return JSON.parse(localStorage.getItem("ingredientImages") || "{}")
    });
    const [activeTutTab, setActiveTutTab] = useState(0);
    const [stepIngredients, setStepIngredients] = useState<Array<string>>([]);
    const [stepTools, setStepTools] = useState<Array<string>>([]);
    const [stepActions, setStepActions] = useState<Array<string>>([]);
    const [stepResult, setStepResult] = useState<Record<string, string>>({});
    const [stepData, setStepData] = useState<Record<number, StepData>>({});
    const [createdItems, setCreatedItems] = useState<string[]>([]);
    const requestedRef = useRef(new Set<string>());


    const toImagePath = (name: string) => {
        return `/images/${name
            .toLowerCase() 
            .replace(/\s+/g, "_")
            .replace(/[^\w_]/g, "")
        }.png`;
    };

    const stepSeparator = (step: string) => {

        const payload = {
            current_step: step,
            ingredients: recipe?.ingredients,
            created_items: createdItems,
            all_steps: recipe?.steps
        }

        fetch("http://localhost:8080/separate", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        })
        
        .then(response => response.json())
        .then (data => {
            console.log(payload);
            console.log("Agent response:", data);

            const toolsRaw = data.tools || [];
            let newCreatedItems = createdItems;

            if (data.creates) {
                newCreatedItems = [...createdItems, data.creates];
                setCreatedItems(newCreatedItems);
            }

            const createsRaw = data.creates ? [data.creates] : [];

            [...toolsRaw, ...createsRaw].forEach(generateImage);

            const ingredientImages = (data.ingredients || []).map(toImagePath);
            const toolImages = (toolsRaw.map(toImagePath));
            const actionImages = (data.actions || []).map(toImagePath);

            setStepIngredients(ingredientImages);
            setStepTools(toolImages);
            setStepActions(actionImages);

            const currentStep = activeTutTab;
            
            setStepData(prev => ({
                ...prev,
                [currentStep]: {
                    ingredients: ingredientImages,
                    tools: toolImages,
                    actions: actionImages,
                    creates: createsRaw
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
        console.log("generateImage called:", ingredientName);
        if (ingredientImages[ingredientName]) return;
        if (requestedRef.current.has(ingredientName)) return;

        requestedRef.current.add(ingredientName);

        try {
            const res = await fetch("http://localhost:8080/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredient: ingredientName })
            });
            console.log("response status:", res.status);

            const data = await res.json();

            setIngredientImages(prev => ({ ...prev, [ingredientName]: data.image_path }));
        } catch (err) {
            console.error("Image generation error:", err);
        }
    };


    useEffect(() => {
        if (!recipe) return;

        const generateStep = async () => {
            if (stepResult[activeTutTab]) return;

            const previous = activeTutTab === 0
                ? null
                : stepResult[activeTutTab - 1];

            const res = await fetch("/generate-result-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    step: recipe.steps[activeTutTab],
                    previous,
                    index: activeTutTab + 1,
                    name: recipe.name
                })
            });

            const data = await res.json();

            setStepResult(prev => ({
                ...prev,
                [activeTutTab]: data.image_path
            }));
        };

        generateStep();
    }, [activeTutTab, recipe]);

    useEffect(() => {
        Object.keys(ingredientImages).forEach(key => {
            requestedRef.current.add(key);
        });
    }, [ingredientImages]);

    useEffect(() => {
        if (!recipe) return;

        const run = async () => {
            for (const ingredient of recipe.ingredients) {
                await generateImage(ingredient);
            }
        };

        run();
    }, [recipe]);

    useEffect(() => {
        localStorage.setItem("ingredientImages", JSON.stringify(ingredientImages));
    }, [ingredientImages]);

    return (
        <div className="game-container">
            <div><button className="button-back" onClick={() => {setStepData({}); navigate(`/collection/`)}}>←</button></div>
            <div className="board-container">
                <div className="board-card">
                    <div className="tab-title">
                        <h2 className={activeBoardTab==="Recipe tutorial"? "active-recipe-tab" : "inactive-tab"} onClick={() => handleBoardTabClick("Recipe tutorial")}>Recipe tutorial</h2>
                        <h2 className={activeBoardTab==="Quizz"? "active-quizz-tab" : "inactive-tab"} onClick={() => handleBoardTabClick("Quizz")}>Quizz</h2>
                    </div>
                    <div style={{width: "100%"}} className="show-part">
                        { 
                        activeBoardTab === "Quizz"?
                            <>
                                <div >
                                    Currently not available
                                </div> 
                            </> :
                            <>
                                <div className="step-tabs">
                                    {recipe?.steps.map((step, index) => {
                                        return (
                                            <div className="tabs" key={index}>
                                                <div className={activeTutTab === index? "active-tab" : "inactive-tab"} onClick={() => setActiveTutTab(index)}>
                                                    <h3>Step {index + 1}</h3>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="canvas">
                                    <h3>{recipe?.steps[activeTutTab]}</h3>
                                    <Canvas 
                                        key={activeTutTab}
                                        className="canvas-board"
                                        width={950}
                                        height={750}
                                        ingredients={stepIngredients}
                                        tools={stepTools}
                                        actions={stepActions}
                                        resultImgSrc={stepResult[activeTutTab]}
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
                            <div className="recipe-tab">
                                <h2>{name}</h2>

                                <div className="ingredient-list">
                                    <h3>Ingredients for {recipe? (Number(recipe.portion) === 1 ? `${recipe.portion} portion` : `${recipe.portion} portions`) : ''}</h3>
                                    {recipe && recipe.ingredients && recipe.amount && recipe.ingredients.map((ingredient, index) => (
                                        <div className="ingredients-colors"><p key={index} className="ingred-color">{ingredient}</p> <p>-</p> <p className="amount-color">{recipe.amount[index]}</p></div>))}
                                </div>

                                <div className="step-list">
                                    <h3>Steps</h3>
                                    {recipe && recipe.steps && recipe.steps.map((step, index) => (
                                        <div className="ingredients-colors"><p key={index} className="amount-color">Step {index + 1}:</p> <p className="ingred-color">{step}</p></div>))}
                                </div>
                            </div> :
                            <>
                                <div className="chat-container">
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
