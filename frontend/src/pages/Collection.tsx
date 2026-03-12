import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import '../styles/Collection.css'


interface Recipe {
    category: string;
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
    const [filteredRecipe, setFilteredRecipe] = useState<Array<Recipe>>(recipe);
    
    useEffect (() => {
        fetch('../recipes.json')
            .then(response => response.json())
            .then(recipe => {
                setRecipe(recipe);
                setFilteredRecipe(recipe);
            })
            .catch(error => console.error('Error fetching data', error));
    }, []);

    

    const recipeInfo = (recipe: Recipe) => {
        setCurrentRecipe(recipe);
    };

    const handleClose = () => {
        setCurrentRecipe(null);
    };
    
    const filtering = (value: string) => {
        if (value === "default") {
            setFilteredRecipe(recipe);
        } else if (value === "warm") {
             const temp = recipe.filter(item => item.category === "warm drinks");
            setFilteredRecipe(temp);
        } else if (value === "cold") {
            const temp = recipe.filter(item => item.category === "cold drinks");
            setFilteredRecipe(temp);
        }
    };

    return (
        <div>
            <div className="filter-sort">
                <select className="selection" onChange={(e) => filtering(e.target.value)}>
                    <option value="default">All items</option>
                    <option value="warm">Warm drinks</option>
                    <option value="cold">Cold drinks</option>
                </select>
            </div>
            
            <div className="collection-container">
                {filteredRecipe.map((recipe, index) => {
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
                            <div className="modal-info">
                                <h2>{currentRecipe.name}</h2>
                                <h4>{currentRecipe.description}</h4>
                            
                                <div className="modal-buttons">
                                    <button onClick={handleClose} className="back-button">Back</button>
                                    <button className="start-button" onClick={() => navigate(`/start/${currentRecipe.name}`)}>Start</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Collection;