import type { CookingAction } from "../../lib/cooking-actions";
import type { ActionAnimation } from "./types";
import addIce from "./AddIce";
import addPieces from "./AddPieces";
import brew from "./Brew";
import froth from "./Froth";
import heat from "./Heat";
import layer from "./Layer";
import melt from "./Melt";
import pour from "./Pour";
import remove from "./Remove";
import sift from "./Sift";
import simmer from "./Simmer";
import steep from "./Steep";
import stir from "./Stir";
import whisk from "./Whisk";

export const animations: Partial<Record<CookingAction, ActionAnimation>> = {
  "add-ice": addIce, "add-pieces": addPieces, brew, froth, heat, layer, melt, pour, remove, sift, simmer, steep, stir, whisk,
};
