import type { CookingAction } from "../../lib/cooking-actions";
import type { ActionAnimation } from "./types";
import layer from "./Layer";
import pour from "./Pour";
import sift from "./Sift";
import whisk from "./Whisk";

export const animations: Partial<Record<CookingAction, ActionAnimation>> = { layer, pour, sift, whisk };
