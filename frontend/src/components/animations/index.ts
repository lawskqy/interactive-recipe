import type { CookingAction } from "../../lib/cooking-actions";
import type { ActionAnimation } from "./types";
import addIce from "./AddIce";
import froth from "./Froth";
import heat from "./Heat";
import layer from "./Layer";
import pour from "./Pour";
import sift from "./Sift";
import simmer from "./Simmer";
import stir from "./Stir";
import whisk from "./Whisk";

export const animations: Partial<Record<CookingAction, ActionAnimation>> = {
  "add-ice": addIce, froth, heat, layer, pour, sift, simmer, stir, whisk,
};
