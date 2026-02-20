import React, { useRef, useEffect } from "react";


interface CanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
    ingredients: string[];
    tools: string[];
    actions: string[];
}

interface AnimatedItem {
    img: HTMLImageElement;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
}



const Canvas: React.FC<CanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);


    useEffect(() => {
        if (!props.ingredients.length && !props.tools.length) {
        return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const gridSpacing = 10;
        let row = 0;
        let col = 0;

        const items: AnimatedItem[] = [
            ...props.ingredients.map (i => ({
                img: new Image (),
                x: col * gridSpacing + 10,
                y: row * gridSpacing + 10,
                targetX: centerX,
                targetY: centerY,
            })),
            ...props.tools.map (t => ({
                img: new Image (),
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                targetX: centerX,
                targetY: centerY,
            })),
        ];

        items.forEach((item, index) => {
            const src = props.ingredients[index] || props.tools[index - props.ingredients.length] || "";
            if (src) {
                item.img.src = src;
            }
        });

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            items.forEach(item => {
                item.x += (item.targetX - item.x) * 0.55;
                item.y += (item.targetY - item.y) * 0.55;
                ctx.drawImage(item.img, item.x, item.y, 80, 80);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [props.ingredients, props.tools]);


    return <canvas ref={canvasRef} {...props} />;
};

export default Canvas;
