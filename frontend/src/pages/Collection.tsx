import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import '../styles/Collection.css'


interface Recipe {
    name: string;
    steps: string[];
    ingredients: string[];
    image: string;
    description: string;
    time: string
}



const Collection = () => {
    const navigate = useNavigate();
    const [currentRecipe, setCurrentRecipe] = useState <Recipe | null>(null);

    const [recipe, setRecipe] = useState<Array<Recipe>>([]);
    
    useEffect (() => {
        fetch('../recipes.json')
            .then(response => response.json())
            .then(recipe => setRecipe(recipe))
            .catch(error => console.error('Error fetching data', error));
    }, []);

    const recipeInfo = (recipe: Recipe) => {
        setCurrentRecipe(recipe);
    }

    const handleClose = () => {
        setCurrentRecipe(null);
    }

    return (
        <div>
            <div className="collection-container">
                {recipe.map((recipe, index) => {
                    return (
                        <div key={index} className="name-card">
                            <button className="name-card name-card-click" onClick={() => recipeInfo(recipe)}>
                                <img src={recipe.image}></img>
                                <p>{recipe.name}</p>
                            </button>
                        </div>
                    )
                })}
            </div>

            <div>
                {currentRecipe && (
                    <div className="overlay" onClick={handleClose}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <img src={currentRecipe.image}></img>
                            <h2>{currentRecipe.name}</h2>
                            <h3>{currentRecipe.description}</h3>
                            <div className="modal-buttons">
                                <button onClick={handleClose} className="back-button">Back</button>
                                <button className="start-button" onClick={() => navigate(`/start/${currentRecipe.name}`)}>Start</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Collection;