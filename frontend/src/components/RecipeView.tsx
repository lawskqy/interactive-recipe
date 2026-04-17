interface RecipeViewProps {
    recipe: any;
    name: string | undefined;
}

const RecipeView = ({ recipe, name }: RecipeViewProps) => {
    return (
        <div className="recipe-tab">
            <h2>{name}</h2>

            <div className="ingredient-list">
                <h3>
                    Ingredients for{" "}
                    {recipe
                        ? Number(recipe.portion) === 1
                          ? `${recipe.portion} portion`
                          : `${recipe.portion} portions`
                      : ""}
                </h3>

                {recipe?.ingredients.map((ingredient: string, index: number) => (
                    <div className="ingredients-colors" key={index}>
                        <p className="ingred-color">{ingredient}</p>
                        <p>-</p>
                        <p className="amount-color">{recipe.amount[index]}</p>
                    </div>
                ))}
            </div>

            <div className="step-list">
                <h3>Steps</h3>
                {recipe?.steps.map((step: string, index: number) => (
                    <div className="steps-colors" key={index}>
                        <span className="amount-color step-pos">
                          Step {index + 1}:
                        </span>
                        <span className="ingred-color step-text-pos">{step}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecipeView;