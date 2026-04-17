import { useState, useEffect, useRef } from "react";
import { useParams } from 'react-router-dom';
import '../styles/StartRecipe.css';
import { useNavigate } from "react-router-dom";

import RecipeView from "../components/RecipeView";
import ChatView from "../components/ChatView";
import TutorialBoard from "../components/TutorialBoard";

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
    const [assetsReady, setAssetsReady] = useState(false);

    const toImagePath = (name: string) => {
        return `/images/${name.toLowerCase().replace(/\s+/g, "_").replace(/[^\w_]/g, "")}_seg.png`;
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
        .then(data => {
            const toolsRaw = data.tools || [];
            let newCreatedItems = createdItems;

            if (data.creates) {
                newCreatedItems = [...createdItems, data.creates];
                setCreatedItems(newCreatedItems);
            }

            const createsRaw = data.creates ? [data.creates] : [];
            [...toolsRaw, ...createsRaw].forEach(generateImage);

            const ingredientImagesArr = (data.ingredients || []).map((name: string) =>
                ingredientImages[name] || toImagePath(name)
            );

            const toolImagesArr = toolsRaw.map((name: string) =>
                ingredientImages[name] || toImagePath(name)
            );

            const actionImagesArr = (data.actions || []).map((name: string) =>
                ingredientImages[name] || toImagePath(name)
            );

            setStepIngredients(ingredientImagesArr);
            setStepTools(toolImagesArr);
            setStepActions(actionImagesArr);


            setStepData(prev => ({
                ...prev,
                [activeTutTab]: {
                    ingredients: ingredientImagesArr,
                    tools: toolImagesArr,
                    actions: actionImagesArr,
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
    };

    useEffect (() => {
        if (activeTab === "Chat"){
            Scroll();
        }
    }, [messages, activeTab]);


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
                    } catch (err) {}
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


    const generateImage = async (ingredientName: string) => {
        try {
            const res = await fetch("http://localhost:8080/generate-and-segment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredient: ingredientName })
            });

            const data = await res.json();

            setIngredientImages(prev => ({
                ...prev,
                [ingredientName]: data.image_path
            }));

        } catch (err) {
            console.error("Image pipeline error:", err);
        }
    };

    const checkImagesReady = async (sources: string[]) => {
        const results = await Promise.all(
            sources.map((src) => new Promise<boolean>((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
            }))
        );
        return results.every(Boolean);
    };

    useEffect(() => {
        if (!recipe) return;
        const step = stepData[activeTutTab];
        if (!step) return;

        const allSources = [...step.ingredients, ...step.tools];
        setAssetsReady(false);
        checkImagesReady(allSources).then((ready) => setAssetsReady(ready));
    }, [stepData, activeTutTab]);

    useEffect(() => {
        if (!recipe) return;

        const generateStep = async () => {
            if (stepResult[activeTutTab]) return;

            const previous = activeTutTab === 0
                ? `/images/${recipe.name}.png`
                : stepResult[activeTutTab - 1] || `/images/${recipe.name}.png`;

            const res = await fetch("http://localhost:8080/generate-result-image", {
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
            setStepResult(prev => ({ ...prev, [activeTutTab]: data.image_path }));
        };

        generateStep();
    }, [activeTutTab, recipe, stepResult]);

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

    useEffect(() => {
        if (!recipe) return;

        setStepData({});
        setStepResult({});
        setCreatedItems([]);
        setStepIngredients([]);
        setStepTools([]);
        setStepActions([]);
    }, [recipe]);

    return (
        <div className="game-container">
            <div><button className="button-back" onClick={() => {setStepData({}); navigate(`/collection/`)}}>←</button></div>

            <TutorialBoard
                activeBoardTab={activeBoardTab}
                setActiveBoardTab={setActiveBoardTab}
                recipe={recipe}
                activeTutTab={activeTutTab}
                setActiveTutTab={setActiveTutTab}
                stepIngredients={stepIngredients}
                stepTools={stepTools}
                stepActions={stepActions}
                stepResult={stepResult}
                assetsReady={assetsReady}
            />

            <div className="recipe-container">
                <div className="recipe-card">
                    <div className="tab-title">
                        <h2
                        className={
                            activeTab === "Recipe" ? "active-recipe-tab" : "inactive-tab"
                        }
                        onClick={() => setActiveTab("Recipe")}
                        >
                        Recipe
                        </h2>

                        <h2
                        className={
                            activeTab === "Chat" ? "active-chat-tab" : "inactive-tab"
                        }
                        onClick={() => setActiveTab("Chat")}
                        >
                        Chat
                        </h2>
                    </div>

                    {activeTab === "Recipe" ? (
                        <RecipeView recipe={recipe} name={name} />
                    ) : (
                        <ChatView
                        messages={messages}
                        userMessage={userMessage}
                        setUserMessage={setUserMessage}
                        handleSend={handleSend}
                        textareaRef={textareaRef}
                        containerRef={container}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default StartRecipe;
