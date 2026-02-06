import React, { useRef, useEffect } from "react";


interface CanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
    ingredients: { name: string; image?: string }[];
    tools: { name: string; image?: string }[];
    actions: { name: string }[];
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

    const draw = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    pos: { x: number; y: number }
    ) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, pos.x, pos.y, 80, 80);
    };


    useEffect(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        items.forEach (item => {
            item.x += (item.targetX - item.x) * 0.05;
            item.y += (item.targetY - item.y) * 0.05;

            ctx.drawImage(item.img, item.x, item.y, 80, 80);
        })
    });

    animationFrameId = requestAnimationFrame(render);

    return <canvas ref={canvasRef} {...props} />;
};

export default Canvas;
