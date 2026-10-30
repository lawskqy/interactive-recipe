import type { CookingAction } from "../../lib/cooking-actions";
import type { ActionAnimation } from "./types";
import addIce from "./AddIce";
import addPieces from "./AddPieces";
import blend from "./Blend";
import brew from "./Brew";
import froth from "./Froth";
import garnish from "./Garnish";
import heat from "./Heat";
import layer from "./Layer";
import mash from "./Mash";
import melt from "./Melt";
import pour from "./Pour";
import remove from "./Remove";
import shake from "./Shake";
import sift from "./Sift";
import simmer from "./Simmer";
import spoonIn from "./SpoonIn";
import spoonTop from "./SpoonTop";
import sprinkle from "./Sprinkle";
import steep from "./Steep";
import stir from "./Stir";
import strain from "./Strain";
import whisk from "./Whisk";

export const animations: Partial<Record<CookingAction, ActionAnimation>> = {
  "add-ice": addIce, "add-pieces": addPieces, blend, brew, froth, garnish, heat, layer, mash, melt, pour, remove, shake, sift, simmer, "spoon-in": spoonIn, "spoon-top": spoonTop, sprinkle, steep, stir, strain, whisk,
};
