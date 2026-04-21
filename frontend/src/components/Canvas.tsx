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
    opacity?: number;
}

type AnimationState =
    | "IDLE"
    | "MOVING"
    | "EXPLODING"
    | "SHOW_RESULT";

const Canvas: React.FC<CanvasProps> = ({ ingredients, tools, resultImgSrc, ...props }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const state = useRef<AnimationState>("IDLE");
    const items = useRef<AnimatedItem[]>([]);
    const staticItems = useRef<AnimatedItem[]>([]);
    const particlesRef = useRef<any[]>([]);
    const rafRef = useRef<number | null>(null);
    const isRunning = useRef(true);
    const resultTimeout = useRef<number | null>(null);
    const isPaused = useRef(false);
    const [resultImg, setResultImg] = useState<HTMLImageElement | null>(null);
    const [activeButton, setActiveButton] = useState(false);

    const loadImages = (sources: string[]) => {
        return Promise.all(
            sources.map((src) => {
                return new Promise<HTMLImageElement>((resolve) => {
                    const img = new Image();
                    img.src = src;
                    img.onload = () => resolve(img);
                    img.onerror = () => {
                        const fallback = new Image();
                        fallback.src = "/images/fallback.png";
                        fallback.onload = () => resolve(fallback);
                    };
                });
            })
        );
    };

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
        for (let i = 0; i < 120; i++) {
            arr.push({
                x: cx,
                y: cy,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 4 - 2,
                size: Math.random() * 6 + 2,
                life: 0,
                death: Math.random() * 80 + 60,
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
        ctx.fillStyle = "white";
        particlesRef.current.forEach((p) => {
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

        isRunning.current = true;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (resultTimeout.current) clearTimeout(resultTimeout.current);

        items.current = [];
        staticItems.current = [];
        particlesRef.current = [];
        state.current = "IDLE";

        const allSources = [...ingredients, ...tools];
        if (!allSources.length) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        loadImages(allSources).then((loadedImages) => {
            if (!isRunning.current) return;

            staticItems.current = loadedImages.map((img, index) => {
                const x = (index % 5) * 160 + 20;
                const y = Math.floor(index / 5) * 160 + 20;
                return {
                    img,
                    label: allSources[index].split("/").pop()?.replace(".png", "").replace("_seg", "").replaceAll("_", " ") || "",
                    x,
                    y,
                    startX: x,
                    startY: y,
                    targetX: x,
                    targetY: y,
                };
            });

            items.current = loadedImages.map((img, index) => {
                const x = (index % 5) * 160 + 20;
                const y = Math.floor(index / 5) * 160 + 20;
                return {
                    img,
                    label: allSources[index].split("/").pop()?.replace(".png", "") || "",
                    x,
                    y,
                    startX: x,
                    startY: y,
                    targetX: centerX - 40,
                    targetY: centerY - 40,
                    opacity: 0,
                };
            });

            state.current = "MOVING";

            const render = () => {
                if (!isRunning.current) return;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                staticItems.current.forEach((item) => {
                    if (item.img.complete && item.img.naturalWidth > 0) {
                        ctx.drawImage(item.img, item.x, item.y, 100, 100);
                    } else {
                        ctx.fillStyle = "#444";
                        ctx.fillRect(item.x, item.y, 80, 80);
                    }
                    ctx.fillStyle = "white";
                    ctx.font = "14px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(item.label, item.x + 50, item.y + 100);
                });

                items.current.forEach((item) => {
                    item.opacity = (item.opacity || 0) + 0.02;
                    if (item.opacity > 1) item.opacity = 1;
                    ctx.globalAlpha = item.opacity;
                    if (item.img.complete && item.img.naturalWidth > 0) {
                        ctx.drawImage(item.img, item.x, item.y, 100, 100);
                    }
                    ctx.globalAlpha = 1;
                });

                if (!isPaused.current) {
                    if (state.current === "MOVING") {
                        let done = true;
                        items.current.forEach((item) => {
                            const speed = 0.02;
                            item.x += (item.targetX - item.x) * speed;
                            item.y += (item.targetY - item.y) * speed;
                            if (Math.abs(item.x - item.targetX) > 0.5) done = false;
                            if (Math.abs(item.y - item.targetY) > 0.5) done = false;
                        });
                        if (done) {
                            state.current = "EXPLODING";
                            createParticles(centerX, centerY);
                        }
                    }

                    if (state.current === "EXPLODING") {
                        updateParticles();
                        drawParticles(ctx);
                        if (particlesRef.current.length < 10) {
                            state.current = "SHOW_RESULT";
                            resultTimeout.current = window.setTimeout(() => {
                                items.current.forEach((item) => {
                                    item.x = item.startX;
                                    item.y = item.startY;
                                    item.opacity = 0;
                                });
                                particlesRef.current = [];
                                state.current = "MOVING";
                            }, 7000);
                        }
                    }
                }

                if (state.current === "SHOW_RESULT") {
                    const size = Math.min(canvas.width, canvas.height);
                    if (resultImg?.complete && resultImg.naturalWidth > 0) {
                        ctx.drawImage(resultImg, centerX - size / 2, centerY - size / 2, size, size);
                    } else {
                        ctx.fillStyle = "white";
                        ctx.textAlign = "center";
                        ctx.font = "20px sans-serif";
                        ctx.fillText("Loading...", centerX, centerY);
                    }
                }

                rafRef.current = requestAnimationFrame(render);
            };

            render();
        });

        return () => {
            isRunning.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (resultTimeout.current) clearTimeout(resultTimeout.current);
        };
    }, [ingredients, tools, resultImg]);

    const pauseAnimation = () => {
        isPaused.current = true;
        setActiveButton(true);
    };

    const resumeAnimation = () => {
        isPaused.current = false;
        setActiveButton(false);
    };

    const restartAnimation = () => {
        items.current.forEach((item) => {
            item.x = item.startX;
            item.y = item.startY;
            item.opacity = 0;
        });
        particlesRef.current = [];
        state.current = "MOVING";
        resumeAnimation();
        setActiveButton(false);
    };

    return (
        <>
            <canvas ref={canvasRef} {...props} />
            <div className="button-container">
                <button className={`buttons ${activeButton ? "pressed" : ""}`} onClick={pauseAnimation}>Pause</button>
                <button className="buttons" onClick={resumeAnimation}>Resume</button>
                <button className="buttons" onClick={restartAnimation}>Restart</button>
            </div>
        </>
    );
};

export default Canvas;
