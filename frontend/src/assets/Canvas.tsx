import React, { useRef, useEffect, useState } from "react";

interface CanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
    ingredients: string[];
    tools: string[];
    actions: string[];
    resultImgSrc?: string; 
}

interface AnimatedItem {
    img: HTMLImageElement;
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
    const animatedItems = useRef<AnimatedItem[]>([]);
    const explosionTimer = useRef<number | null>(null);
    const isPaused = useRef(false);

    const toolItem = useRef<AnimatedItem | null>(null);
    const ingredientItem = useRef<AnimatedItem []>([]);

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
            const item: AnimatedItem = {
                img: new Image(),
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

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            staticItems.current.forEach(item => {
                if (item.img.complete && item.img.naturalWidth !== 0) {
                ctx.drawImage(item.img, item.x, item.y, 80, 80);
                }
            });

            if (toolItem.current) {
                ctx.drawImage(toolItem.current.img, toolItem.current.x, toolItem.current.y, 80, 80);
            }

            ingredientItem.current.forEach(item => {
                if (item.img.complete && item.img.naturalWidth !== 0) {
                    ctx.drawImage(item.img, item.x, item.y, 80, 80);
                }
            });

            if (!isPaused.current) {
                let allReachedCenter = true;

                if (state.current === "TOOL_MOVING" && toolItem.current) {
                    toolItem.current.x += (toolItem.current.targetX - toolItem.current.x) * 0.01;
                    toolItem.current.y += (toolItem.current.targetY - toolItem.current.y) * 0.01;

                    const distance = Math.hypot(toolItem.current.x - toolItem.current.targetX, toolItem.current.y - toolItem.current.targetY);
                    if (distance < 1) {
                        state.current = ("INGREDIENTS_MOVING");
                    }
                } 

                
                if(state.current === "INGREDIENTS_MOVING") {
                    ingredientItem.current.forEach(item => {
                        item.x += (item.targetX - item.x) * 0.01;
                        item.y += (item.targetY - item.y) * 0.01;

                        const distance = Math.hypot(item.x - item.targetX, item.y - item.targetY);
                        if (distance > 1) allReachedCenter = false;
                    });

                    if (allReachedCenter) {
                        state.current = ("EXPLODING");
                        explosionTimer.current = window.setTimeout(() => {
                        state.current = ("SHOW_RESULT");
                        }, 1000);
                    }
                } else if (state.current === "EXPLODING") {
                    ctx.fillStyle = "rgba(255,255,255,0.3)";
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
                    ctx.fill();
                } else if (state.current === "SHOW_RESULT" && resultImg) {
                    ctx.drawImage(resultImg, canvas.width / 2 - 40, canvas.height / 2 - 40, 80, 80);
                }
            } 
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
        cancelAnimationFrame(animationFrameId);
        if (explosionTimer.current) clearTimeout(explosionTimer.current);
        };
    }, [ingredients, tools, resultImgSrc]);

    const pauseAnimation = () => { isPaused.current = true; };
    const resumeAnimation = () => { isPaused.current = false; };

    const restartAnimation = () => {
        animatedItems.current.forEach(item => {
        item.x = item.startX;
        item.y = item.startY;
        });
        state.current = ("TOOL_MOVING");
    };

    return (
        <>
        <canvas ref={canvasRef} {...props} />
        <div style={{ marginTop: 10 }}>
            <button onClick={pauseAnimation}>Pause</button>
            <button onClick={resumeAnimation}>Resume</button>
            <button onClick={restartAnimation}>Restart</button>
        </div>
        </>
    );
};

export default Canvas;
