import type { CookingAction } from "../../lib/cooking-actions";
import type { ActionAnimation } from "./types";
import addIce from "./AddIce";
import addPieces from "./AddPieces";
import blend from "./Blend";
import brew from "./Brew";
import cut from "./Cut";
import froth from "./Froth";
import garnish from "./Garnish";
import heat from "./Heat";
import layer from "./Layer";
import mash from "./Mash";
import melt from "./Melt";
import pour from "./Pour";
import remove from "./Remove";
import rinse from "./Rinse";
import serve from "./Serve";
import shake from "./Shake";
import sift from "./Sift";
import simmer from "./Simmer";
import spoonIn from "./SpoonIn";
import spoonTop from "./SpoonTop";
import sprinkle from "./Sprinkle";
import squeeze from "./Squeeze";
import steep from "./Steep";
import stir from "./Stir";
import strain from "./Strain";
import tap from "./Tap";
import wait from "./Wait";
import whisk from "./Whisk";

export const animations: Partial<Record<CookingAction, ActionAnimation>> = {
  "add-ice": addIce, "add-pieces": addPieces, blend, brew, cut, froth, garnish, heat, layer, mash, melt, pour, remove, rinse, serve, shake, sift, simmer, "spoon-in": spoonIn, "spoon-top": spoonTop, sprinkle, squeeze, steep, stir, strain, tap, wait, whisk,
};
