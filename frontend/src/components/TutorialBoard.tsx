import Canvas from "./Canvas";

interface Props {
    activeBoardTab: string;
    setActiveBoardTab: (tab: string) => void;

    recipe: any;

    activeTutTab: number;
    setActiveTutTab: (i: number) => void;

    stepIngredients: string[];
    stepTools: string[];
    stepActions: string[];

    stepResult: Record<number, string>;
    assetsReady: boolean;
}

const TutorialBoard = ({
    activeBoardTab,
    setActiveBoardTab,
    recipe,
    activeTutTab,
    setActiveTutTab,
    stepIngredients,
    stepTools,
    stepActions,
    stepResult,
    assetsReady,
    }: Props) => {
    return (
        <div className="board-container">
        <div className="board-card">
            <div className="tab-title">
            <h2
                className={
                activeBoardTab === "Recipe tutorial"
                    ? "active-recipe-tab"
                    : "inactive-tab"
                }
                onClick={() => setActiveBoardTab("Recipe tutorial")}
            >
                Recipe tutorial
            </h2>

            <h2
                className={
                activeBoardTab === "Quizz"
                    ? "active-quizz-tab"
                    : "inactive-tab"
                }
                onClick={() => setActiveBoardTab("Quizz")}
            >
                Quizz
            </h2>
            </div>

            <div style={{ width: "100%" }} className="show-part">
            {activeBoardTab === "Quizz" ? (
                <div>Currently not available</div>
            ) : (
                <>
                <div className="step-tabs">
                    {recipe?.steps.map((_: string, index: number) => (
                    <div className="tabs" key={index}>
                        <div
                        className={
                            activeTutTab === index
                            ? "active-tab"
                            : "inactive-tab"
                        }
                        onClick={() => setActiveTutTab(index)}
                        >
                        <h3>Step {index + 1}</h3>
                        </div>
                    </div>
                    ))}
                </div>

                <div className="canvas">
                    <h3>{recipe?.steps[activeTutTab]}</h3>

                    {assetsReady ? (
                    <Canvas
                        key={activeTutTab}
                        className="canvas-board"
                        width={700}
                        height={700}
                        ingredients={stepIngredients}
                        tools={stepTools}
                        actions={stepActions}
                        resultImgSrc={stepResult[activeTutTab]}
                    />
                    ) : (
                    <div style={{ color: "white", textAlign: "center" }}>
                        Generating images...
                    </div>
                    )}
                </div>
                </>
            )}
            </div>
        </div>
        </div>
    );
};

export default TutorialBoard;