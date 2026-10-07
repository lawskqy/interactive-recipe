import { useState } from "react";
import type { Recipe } from "../lib/recipe";
import placeholder from "../assets/recipe-placeholder.svg";

export default function RecipeCover({
  recipe,
  alt = "",
  loading = "eager",
  className,
}: {
  recipe: Pick<Recipe, "id" | "image">;
  alt?: string;
  loading?: "eager" | "lazy";
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const sources = [
    `/thumbnails/${recipe.id}.webp`,
    `/images/${recipe.image}`,
    placeholder,
  ];

  return (
    <img
      className={className}
      src={sources[attempt]}
      alt={alt}
      loading={loading}
      width="480"
      height="480"
      onError={attempt < 2 ? () => setAttempt(attempt + 1) : undefined}
    />
  );
}
