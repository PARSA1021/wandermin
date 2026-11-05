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
import { rioDeJaneiroScene } from "./rio-de-janeiro";
import { busanScene } from "./busan";
import { jejuScene } from "./jeju";
import { shanghaiScene } from "./shanghai";
import { daNangScene } from "./da-nang";
import { kualaLumpurScene } from "./kuala-lumpur";
import { agraScene } from "./agra";
import { dubaiScene } from "./dubai";
import { lisbonScene } from "./lisbon";
import { athensScene } from "./athens";
import { reykjavikScene } from "./reykjavik";
import { berlinScene } from "./berlin";
import { marrakechScene } from "./marrakech";
import { nairobiScene } from "./nairobi";
import { zanzibarScene } from "./zanzibar";
import { honoluluScene } from "./honolulu";
import { havanaScene } from "./havana";
import { cuscoScene } from "./cusco";
import { buenosAiresScene } from "./buenos-aires";
import { aucklandScene } from "./auckland";

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
  [rioDeJaneiroScene.cityId]: rioDeJaneiroScene,
  [busanScene.cityId]: busanScene,
  [jejuScene.cityId]: jejuScene,
  [shanghaiScene.cityId]: shanghaiScene,
  [daNangScene.cityId]: daNangScene,
  [kualaLumpurScene.cityId]: kualaLumpurScene,
  [agraScene.cityId]: agraScene,
  [dubaiScene.cityId]: dubaiScene,
  [lisbonScene.cityId]: lisbonScene,
  [athensScene.cityId]: athensScene,
  [reykjavikScene.cityId]: reykjavikScene,
  [berlinScene.cityId]: berlinScene,
  [marrakechScene.cityId]: marrakechScene,
  [nairobiScene.cityId]: nairobiScene,
  [zanzibarScene.cityId]: zanzibarScene,
  [honoluluScene.cityId]: honoluluScene,
  [havanaScene.cityId]: havanaScene,
  [cuscoScene.cityId]: cuscoScene,
  [buenosAiresScene.cityId]: buenosAiresScene,
  [aucklandScene.cityId]: aucklandScene,
};

export const getScene = (cityId: string): PostcardScene | undefined => SCENES[cityId];
export const illustratedCityIds = () => Object.keys(SCENES);
