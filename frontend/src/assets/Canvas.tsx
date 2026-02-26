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

type AnimationState = "IDLE" | "ANIMATING" | "EXPLODING" | "SHOW_RESULT" | "PAUSED";

const Canvas: React.FC<CanvasProps> = ({ ingredients, tools, resultImgSrc, ...props }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [state, setState] = useState<AnimationState>("IDLE");
    const [resultImg, setResultImg] = useState<HTMLImageElement | null>(null);

    const staticItems = useRef<AnimatedItem[]>([]);
    const animatedItems = useRef<AnimatedItem[]>([]);
    const explosionTimer = useRef<number | null>(null);
    const isPaused = useRef(false);

    useEffect(() => {
        if (!ingredients.length && !tools.length) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const gridSpacing = 100;
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

        animatedItems.current = staticItems.current.map(item => ({
            ...item,
            img: new Image(),
            x: item.startX,
            y: item.startY,
        }));

        animatedItems.current.forEach((item, i) => {
            item.img.src = allImages[i];
        });

        setState("ANIMATING");

        if (resultImgSrc) {
            const res = new Image();
            res.src = resultImgSrc;
            res.onload = () => setResultImg(res);
        }

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            staticItems.current.forEach(item => {
                if (item.img.complete && item.img.naturalWidth !== 0) {
                ctx.drawImage(item.img, item.x, item.y, 30, 30);
                }
            });

            if (!isPaused.current && state === "ANIMATING") {
                let allReachedCenter = true;
                animatedItems.current.forEach(item => {
                    item.x += (item.targetX - item.x) * 0.05;
                    item.y += (item.targetY - item.y) * 0.05;

                    if (item.img.complete && item.img.naturalWidth !== 0) {
                        ctx.drawImage(item.img, item.x, item.y, 30, 30);
                    }

                    const distance = Math.hypot(item.x - item.targetX, item.y - item.targetY);
                    if (distance > 1) allReachedCenter = false;
                });

                if (allReachedCenter) {
                    setState("EXPLODING");
                    explosionTimer.current = window.setTimeout(() => {
                    setState("SHOW_RESULT");
                    }, 1000);
                }
            } else if (state === "EXPLODING") {
                ctx.fillStyle = "rgba(255,255,255,0.3)";
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
                ctx.fill();
            } else if (state === "SHOW_RESULT" && resultImg) {
                ctx.drawImage(resultImg, canvas.width / 2 - 40, canvas.height / 2 - 40, 80, 80);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
        cancelAnimationFrame(animationFrameId);
        if (explosionTimer.current) clearTimeout(explosionTimer.current);
        };
    }, [ingredients, tools, resultImgSrc, state]);

    const pauseAnimation = () => { isPaused.current = true; };
    const resumeAnimation = () => { isPaused.current = false; };

    const restartAnimation = () => {
        animatedItems.current.forEach(item => {
        item.x = item.startX;
        item.y = item.startY;
        });
        setState("ANIMATING");
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
