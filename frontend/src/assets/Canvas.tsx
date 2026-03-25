import React, { useRef, useEffect, useState } from "react";
import "../styles/canvas.css";

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

type AnimationState =
    | "IDLE"
    | "TOOL_MOVING"
    | "INGREDIENTS_MOVING"
    | "EXPLODING"
    | "SHOW_RESULT";

const Canvas: React.FC<CanvasProps> = ({ingredients, tools, resultImgSrc, ...props}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const state = useRef<AnimationState>("IDLE");
    const [resultImg, setResultImg] = useState<HTMLImageElement | null>(null);

    const staticItems = useRef<AnimatedItem[]>([]);
    const toolItem = useRef<AnimatedItem | null>(null);
    const ingredientItem = useRef<AnimatedItem[]>([]);

    const explosionTimer = useRef<number | null>(null);
    const resultTimer = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    const particlesRef = useRef<any[]>([]);

    const isPaused = useRef(false);
    const [pressed, setPressed] = useState<boolean>(false);

    useEffect(() => {
        if (!resultImgSrc) {
        setResultImg(null);
        return;
        }

        const img = new Image();
        img.src = resultImgSrc;
        img.onload = () => setResultImg(img);
    }, [resultImgSrc]);

    const createParticles = (cx: number, cy: number) => {
        const arr = [];
        for (let i = 0; i < 140; i++) {
        arr.push({
            x: cx,
            y: cy,
            vx: Math.random() * 4 - 2,
            vy: Math.random() * 4 - 2,
            size: Math.random() * 10 + 4,
            life: 0,
            death: Math.random() * 120 + 80,
        });
        }
        particlesRef.current = arr;
    };

    const updateParticles = () => {
        particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        return p.life <= p.death;
        });
    };

    const drawParticles = (ctx: CanvasRenderingContext2D) => {
        particlesRef.current.forEach((p) => {
            ctx.fillStyle = "rgb(255,255,255)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (explosionTimer.current) clearTimeout(explosionTimer.current);
        if (resultTimer.current) clearTimeout(resultTimer.current);

        particlesRef.current = [];
        staticItems.current = [];
        ingredientItem.current = [];
        toolItem.current = null;

        state.current = "IDLE";

        if (!ingredients.length && !tools.length) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const allImages = [...ingredients, ...tools];

        staticItems.current = allImages.map((src, index) => {
        const x = (index % 5) * 200 + 20;
        const y = Math.floor(index / 5) * 200 + 20;

        const img = new Image();
        img.src = src;

        return {
            img,
            label: src.split("/").pop()?.replace(".png", "") || "",
            x,
            y,
            startX: x,
            startY: y,
            targetX: centerX - 40,
            targetY: centerY - 40,
        };
        });

        const last = staticItems.current[staticItems.current.length - 1];

        toolItem.current = { ...last };

        ingredientItem.current = staticItems.current.slice(0, -1).map((i) => ({...i,}));

        state.current = "TOOL_MOVING";

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            staticItems.current.forEach((item) => {
                if (item.img.complete) {
                    ctx.drawImage(item.img, item.startX, item.startY, 80, 80);
                    ctx.font = "14px sans-serif";
                    ctx.fillStyle = "#bd9a85";
                    ctx.textAlign = "center";
                    ctx.fillText(item.label, item.startX + 40, item.startY + 100);
                }
            });

            if (toolItem.current) {
                ctx.drawImage(
                toolItem.current.img,
                toolItem.current.x,
                toolItem.current.y,
                80,
                80
                );
            }

            ingredientItem.current.forEach((item) => {
                ctx.drawImage(item.img, item.x, item.y, 80, 80);
            });

            if (!isPaused.current) {
                if (state.current === "TOOL_MOVING" && toolItem.current) {
                    toolItem.current.x += (toolItem.current.targetX - toolItem.current.x) * 0.02;
                    toolItem.current.y += (toolItem.current.targetY - toolItem.current.y) * 0.02;

                    if (
                        Math.hypot(
                            toolItem.current.x - toolItem.current.targetX,
                            toolItem.current.y - toolItem.current.targetY
                        ) < 1
                    ) {
                        state.current = "INGREDIENTS_MOVING";
                    }
                }

                if (state.current === "INGREDIENTS_MOVING") {
                    let done = true;

                    ingredientItem.current.forEach((i) => {
                        i.x += (i.targetX - i.x) * 0.02;
                        i.y += (i.targetY - i.y) * 0.02;

                        if (Math.hypot(i.x - i.targetX, i.y - i.targetY) > 1) {
                            done = false;
                        }
                    });

                    if (done) {
                        state.current = "EXPLODING";
                        createParticles(centerX, centerY);
                    }
                }

                if (state.current === "EXPLODING") {
                    updateParticles();
                    drawParticles(ctx);

                    if (particlesRef.current.length < 10 && resultImg?.complete) {
                        state.current = "SHOW_RESULT";

                        resultTimer.current = window.setTimeout(() => {
                            particlesRef.current = [];

                            ingredientItem.current.forEach((i) => {
                                i.x = i.startX;
                                i.y = i.startY;
                            });

                            if (toolItem.current) {
                                toolItem.current.x = toolItem.current.startX;
                                toolItem.current.y = toolItem.current.startY;
                            }

                            state.current = "TOOL_MOVING";
                        }, 3000);
                    }
                }

                if (state.current === "EXPLODING") {
                    updateParticles();
                    drawParticles(ctx);
                }

                if (state.current === "SHOW_RESULT" && resultImg?.complete) {
                    const size = Math.min(canvas.width, canvas.height) * 0.5;
                    ctx.drawImage(
                        resultImg,
                        centerX - size / 2,
                        centerY - size / 2,
                        size,
                        size
                    );
                }
            }

            rafRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (explosionTimer.current) clearTimeout(explosionTimer.current);
            if (resultTimer.current) clearTimeout(resultTimer.current);
        };
    }, [ingredients, tools, resultImg]);

    const pauseAnimation = () => {
        isPaused.current = true;
    };

    const resumeAnimation = () => {
        isPaused.current = false;
    };

    const resetPositions = () => {
        ingredientItem.current.forEach((item) => {
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
        particlesRef.current = [];
        state.current = "TOOL_MOVING";
        resumeAnimation();
    };

    return (
        <>
        <canvas ref={canvasRef} {...props} />
        <div className="button-container">
            <button
            className={`buttons ${pressed ? "pressed" : ""}`}
            onClick={() => {
                pauseAnimation();
                setPressed(true);
            }}
            >
            Pause
            </button>
            <button
            className="buttons"
            onClick={() => {
                resumeAnimation();
                setPressed(false);
            }}
            >
            Resume
            </button>
            <button
            className="buttons"
            onClick={() => {
                restartAnimation();
                setPressed(false);
            }}
            >
            Restart
            </button>
        </div>
        </>
    );
};

export default Canvas;
