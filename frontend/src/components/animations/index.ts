import type { CookingAction } from "../../lib/cooking-actions";
import type { ActionAnimation } from "./types";
import addIce from "./AddIce";
import addPieces from "./AddPieces";
import blend from "./Blend";
import brew from "./Brew";
import froth from "./Froth";
import heat from "./Heat";
import layer from "./Layer";
import mash from "./Mash";
import melt from "./Melt";
import pour from "./Pour";
import remove from "./Remove";
import sift from "./Sift";
import simmer from "./Simmer";
import spoonIn from "./SpoonIn";
import steep from "./Steep";
import stir from "./Stir";
import whisk from "./Whisk";

export const animations: Partial<Record<CookingAction, ActionAnimation>> = {
  "add-ice": addIce, "add-pieces": addPieces, blend, brew, froth, heat, layer, mash, melt, pour, remove, sift, simmer, "spoon-in": spoonIn, steep, stir, whisk,
};
