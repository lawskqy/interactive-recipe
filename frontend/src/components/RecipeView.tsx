import type { Recipe } from "../lib/recipe";
export default function RecipeView({
  recipe,
  activeStep,
  onStep,
  checked,
  onCheck,
}: {
  recipe: Recipe;
  activeStep: number;
  onStep: (index: number) => void;
  checked: number[];
  onCheck: (index: number) => void;
}) {
  return (
    <div className="recipe-sheet">
      <p className="eyebrow">FROM THE JOURNAL</p>
      <h2>{recipe.name}</h2>
      <p className="recipe-description">{recipe.description}</p>
      <div className="section-heading">
        <h3>Ingredients</h3>
        <span>
          For {recipe.portion} {recipe.portion === 1 ? "serving" : "servings"}
        </span>
      </div>
      <ul className="ingredient-list">
        {recipe.ingredients.map((item, index) => (
          <li key={index}>
            <label>
              <input type="checkbox" checked={checked.includes(index)} onChange={() => onCheck(index)} />
              <span>{item.name}</span>
            </label>
            <span className="ingredient-amount">{item.amount}</span>
          </li>
        ))}
      </ul>
      <div className="section-heading">
        <h3>The method</h3>
        <span>{recipe.steps.length} small steps</span>
      </div>
      <ol className="method-list">
        {recipe.steps.map((step, index) => (
          <li key={index}>
            <button
              aria-current={activeStep === index ? "step" : undefined}
              onClick={() => onStep(index)}
            >
              <span className="step-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
