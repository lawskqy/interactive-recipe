import React, { useRef, useEffect, useState } from "react";
import '../styles/canvas.css';

interface CanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
    ingredients: string[];
    tools: string[];
    actions: string[];
    resultImgSrc?: string; 
}

interface AnimatedItem {
    img: HTMLImageElement;
    label: string;
    x: number;
    y: number;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
}

type AnimationState = "IDLE" | "TOOL_MOVING" | "INGREDIENTS_MOVING" | "EXPLODING" | "SHOW_RESULT" | "PAUSED";

const Canvas: React.FC<CanvasProps> = ({ ingredients, tools, resultImgSrc, ...props }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const state = useRef<AnimationState>("IDLE");
    const [resultImg, setResultImg] = useState<HTMLImageElement | null>(null);
    const staticItems = useRef<AnimatedItem[]>([]);
    const explosionTimer = useRef<number | null>(null);
    const isPaused = useRef(false);

    const toolItem = useRef<AnimatedItem | null>(null);
    const ingredientItem = useRef<AnimatedItem []>([]);
    const resultTimer = useRef<number | null>(null);

    const [pressed, setPressed] = useState<boolean>(false);

    useEffect(() => {
        if (!ingredients.length && !tools.length) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const gridSpacing = 200;
        const columns = 5;

        const allImages = [...ingredients, ...tools];

        staticItems.current = allImages.map((src, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            const x = col * gridSpacing + 20;
            const y = row * gridSpacing + 20;

            const label = src
                .split("/")
                .pop()
                ?.replace(".png", "")
                ?.replaceAll("_", " ") ?? "";

            const item: AnimatedItem = {
                img: new Image(),
                label,
                x,
                y,
                startX: x,
                startY: y,
                targetX: centerX - 40,
                targetY: centerY - 40,
            };
            item.img.src = src;
            return item;
        });

        const toolStatic = staticItems.current[staticItems.current.length-1];

        toolItem.current = {
            img: new Image(),
            label: toolStatic.label,
            x: toolStatic.startX,
            y: toolStatic.startY,
            startX: toolStatic.startX,
            startY: toolStatic.startY,
            targetX: centerX - 40,
            targetY: centerY - 40,
        };
        toolItem.current.img.src = toolStatic.img.src;

        ingredientItem.current = staticItems.current.slice(0, -1).map((item) => {
            const img = new Image();
            img.src = item.img.src;

            return {
                img,
                label: item.label,
                x: item.startX,
                y: item.startY,
                startX: item.startX,
                startY: item.startY,
                targetX: centerX - 40,
                targetY: centerY - 40,
            };
        });

        if (resultImgSrc) {
            const res = new Image();
            res.src = resultImgSrc;
            res.onload = () => setResultImg(res);
        }

        state.current = "TOOL_MOVING";

        let animationFrameId: number;

        staticItems.current.forEach(item => {
            if (item.img.complete && item.img.naturalWidth !== 0) {
                ctx.drawImage(item.img, item.x, item.y, 80, 80);
                ctx.font = "14px sans-serif";
                ctx.fillStyle = "#3a2a20";
                ctx.textAlign = "center";
                ctx.fillText(item.label, item.x + 40, item.y + 100);
            }
        });

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.font = "14px sans-serif";
            ctx.fillStyle = "#3a2a20";
            ctx.textAlign = "center";

            if (toolItem.current) {
                ctx.drawImage(toolItem.current.img, toolItem.current.x, toolItem.current.y, 80, 80);
                ctx.fillText(toolItem.current.label, toolItem.current.x + 40, toolItem.current.y + 100);
            }

            ingredientItem.current.forEach(item => {
                if (item.img.complete && item.img.naturalWidth !== 0) {
                    ctx.drawImage(item.img, item.x, item.y, 80, 80);
                    ctx.fillText(item.label, item.x + 40, item.y + 100);
                }
            });

            if (!isPaused.current) {
                let allReachedCenter = true;

                if (state.current === "TOOL_MOVING" && toolItem.current) {
                    toolItem.current.x += (toolItem.current.targetX - toolItem.current.x) * 0.01;
                    toolItem.current.y += (toolItem.current.targetY - toolItem.current.y) * 0.01;

                    const distance = Math.hypot(toolItem.current.x - toolItem.current.targetX, toolItem.current.y - toolItem.current.targetY);
                    if (distance < 1) {
                        state.current = "INGREDIENTS_MOVING";
                    }
                } 

                if(state.current === "INGREDIENTS_MOVING") {
                    ingredientItem.current.forEach(item => {
                        item.x += (item.targetX - item.x) * 0.01;
                        item.y += (item.targetY - item.y) * 0.01;

                        const distance = Math.hypot(item.x - item.targetX, item.y - item.targetY);
                        if (distance > 1) allReachedCenter = false;
                    });

                    if (allReachedCenter && !explosionTimer.current) {
                        state.current = "EXPLODING";
                        explosionTimer.current = window.setTimeout(() => {
                            state.current = "SHOW_RESULT";

                            resultTimer.current = window.setTimeout(() => {
                                resetPositions();
                                state.current = "TOOL_MOVING";
                            }, 3500)
                        }, 1500);
                    }
                } 

                if (state.current === "EXPLODING") {
                    ctx.fillStyle = "rgb(212, 24, 24)";
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
                    ctx.fill();
                } 

                if (state.current === "SHOW_RESULT" && resultImg) {
                    ctx.drawImage(resultImg, canvas.width / 2 - 40, canvas.height / 2 - 40, 80, 80);
                }
            } 

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (explosionTimer.current) clearTimeout(explosionTimer.current);
            if (resultTimer.current) clearTimeout(resultTimer.current);
        };
    }, [ingredients, tools, resultImgSrc]);

    const pauseAnimation = () => { isPaused.current = true; };
    const resumeAnimation = () => { isPaused.current = false; };

    const resetPositions = () => {
        ingredientItem.current.forEach(item => {
            item.x = item.startX;
            item.y = item.startY;
        });

        if (toolItem.current) {
            toolItem.current.x = toolItem.current.startX;
            toolItem.current.y = toolItem.current.startY;
        }
    };

    const restartAnimation = () => {
        resetPositions();
        state.current = "TOOL_MOVING";
        resumeAnimation();
    };

    return (
        <>
        <canvas ref={canvasRef} {...props} />
        <div className="button-container">
            <button className={`buttons ${pressed ? "pressed" : ""}`} onClick={() => {
                pauseAnimation();
                setPressed(true);
            }}>Pause</button>
            <button className="buttons" onClick={() => {
                resumeAnimation();
                setPressed(false);
            }}>Resume</button>
            <button className="buttons" onClick={() => {
                restartAnimation();
                setPressed(false);
            }}>Restart</button>
        </div>
        </>
    );
};

export default Canvas;
