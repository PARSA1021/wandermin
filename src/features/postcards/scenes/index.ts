import type { PostcardScene } from "../template";
import { tokyoScene } from "./tokyo";
import { seoulScene } from "./seoul";
import { osakaScene } from "./osaka";
import { kyotoScene } from "./kyoto";
import { taipeiScene } from "./taipei";
import { hongKongScene } from "./hong-kong";
import { singaporeScene } from "./singapore";
import { bangkokScene } from "./bangkok";
import { hanoiScene } from "./hanoi";
import { baliScene } from "./bali";
import { londonScene } from "./london";
import { parisScene } from "./paris";
import { romeScene } from "./rome";
import { veniceScene } from "./venice";
import { barcelonaScene } from "./barcelona";
import { amsterdamScene } from "./amsterdam";
import { pragueScene } from "./prague";
import { zurichScene } from "./zurich";
import { viennaScene } from "./vienna";
import { newYorkScene } from "./new-york";
import { losAngelesScene } from "./los-angeles";
import { sanFranciscoScene } from "./san-francisco";
import { vancouverScene } from "./vancouver";
import { torontoScene } from "./toronto";
import { mexicoCityScene } from "./mexico-city";
import { sydneyScene } from "./sydney";
import { melbourneScene } from "./melbourne";
import { cairoScene } from "./cairo";
import { capeTownScene } from "./cape-town";
import { istanbulScene } from "./istanbul";

/**
 * Illustrated scenes by city id. A city without a scene has no postcard yet — the arrival
 * flow must not invent one. Add a city by writing scenes/<city>.ts and registering it here.
 */
const SCENES: Record<string, PostcardScene> = {
  [tokyoScene.cityId]: tokyoScene,
  [seoulScene.cityId]: seoulScene,
  [osakaScene.cityId]: osakaScene,
  [kyotoScene.cityId]: kyotoScene,
  [taipeiScene.cityId]: taipeiScene,
  [hongKongScene.cityId]: hongKongScene,
  [singaporeScene.cityId]: singaporeScene,
  [bangkokScene.cityId]: bangkokScene,
  [hanoiScene.cityId]: hanoiScene,
  [baliScene.cityId]: baliScene,
  [londonScene.cityId]: londonScene,
  [parisScene.cityId]: parisScene,
  [romeScene.cityId]: romeScene,
  [veniceScene.cityId]: veniceScene,
  [barcelonaScene.cityId]: barcelonaScene,
  [amsterdamScene.cityId]: amsterdamScene,
  [pragueScene.cityId]: pragueScene,
  [zurichScene.cityId]: zurichScene,
  [viennaScene.cityId]: viennaScene,
  [newYorkScene.cityId]: newYorkScene,
  [losAngelesScene.cityId]: losAngelesScene,
  [sanFranciscoScene.cityId]: sanFranciscoScene,
  [vancouverScene.cityId]: vancouverScene,
  [torontoScene.cityId]: torontoScene,
  [mexicoCityScene.cityId]: mexicoCityScene,
  [sydneyScene.cityId]: sydneyScene,
  [melbourneScene.cityId]: melbourneScene,
  [cairoScene.cityId]: cairoScene,
  [capeTownScene.cityId]: capeTownScene,
  [istanbulScene.cityId]: istanbulScene,
};

export const getScene = (cityId: string): PostcardScene | undefined => SCENES[cityId];
export const illustratedCityIds = () => Object.keys(SCENES);
