/** @type {Record<string, HTMLImageElement | null>} */
const textures = {
  ar: null,
  shotty: null,
  revolver: null,
  pickup_revolver: null,
  armuzzle: null,
  fish_a: null,
  fish_b: null,
  fish_c: null,
  oceanBg: null,
};

/** Keys match `EnemyTypeDef.spriteKey` in `config/enemies.js` */
/** @type {Record<string, HTMLImageElement | null>} */
const enemySprites = {
  shrimp1: null,
  crab1: null,
  crab2: null,
  cray1: null,
  jelly1: null,
  clam: null,
  fake_fish: null,
  octo1: null,
  cone_snail: null,
  mechocto1: null,
  king_boot: null,
  god_nephropidae: null,
  long_eel: null,
  fishing_hook: null,
  coral: null,
  starfish: null,
};

/** Keys match `textureKey` in `config/vfx.js` */
/** @type {Record<string, HTMLImageElement | null>} */
const vfxTextures = {
  dmac_explosion1: null,
};

/** Keys match item ids in `config/items.js` when an image exists */
/** @type {Record<string, HTMLImageElement | null>} */
const itemTextures = {
  health: null,
  hotsauce: null,
  lucky_neko: null,
};

/**
 * @param {string} key e.g. dmac_explosion1
 * @returns {HTMLImageElement | null}
 */
export function getVfxTexture(key) {
  return vfxTextures[key] ?? null;
}

/**
 * @param {string} key weapon textureKey
 * @returns {HTMLImageElement | null}
 */
export function getWeaponTexture(key) {
  return textures[key] ?? null;
}

/** @returns {HTMLImageElement | null} */
export function getArmuzzleTexture() {
  return textures.armuzzle;
}

/** @param {string} assetKey e.g. fish_a */
export function getFishPortraitTexture(assetKey) {
  return textures[assetKey] ?? null;
}

/** @returns {HTMLImageElement | null} */
export function getOceanBgTexture() {
  return textures.oceanBg;
}

/** @param {string} key e.g. shrimp1 */
export function getEnemySpriteTexture(key) {
  return enemySprites[key] ?? null;
}

/** @param {string} key e.g. hotsauce */
export function getItemTexture(key) {
  return itemTextures[key] ?? null;
}

function loadImage(url) {
  return new Promise((/** @type {(v: HTMLImageElement | null) => void} */ resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function loadGameAssets() {
  const arUrl = new URL('../assets/weapons/ar.png', import.meta.url).href;
  const shottyUrl = new URL('../assets/weapons/shotty.png', import.meta.url).href;
  const revolverUrl = new URL('../assets/weapons/revolver.png', import.meta.url).href;
  const pickupRevolverUrl = new URL('../assets/weapons/pickup_revolver.png', import.meta.url).href;
  const muzzleUrl = new URL('../assets/muzzle/armuzzle.png', import.meta.url).href;
  const fishA = new URL('../assets/fish/a.png', import.meta.url).href;
  const fishB = new URL('../assets/fish/b.png', import.meta.url).href;
  const fishC = new URL('../assets/fish/c.png', import.meta.url).href;
  const oceanUrl = new URL('../assets/bg/ocean1.png', import.meta.url).href;
  const shrimp1Url = new URL('../assets/fish/shrimp1.png', import.meta.url).href;
  const crab1Url = new URL('../assets/fish/crab1.png', import.meta.url).href;
  const crab2Url = new URL('../assets/fish/crab2.png', import.meta.url).href;
  const cray1Url = new URL('../assets/fish/cray1.png', import.meta.url).href;
  const jelly1Url = new URL('../assets/fish/jelly1.png', import.meta.url).href;
  const clamUrl = new URL('../assets/fish/clam.png', import.meta.url).href;
  const fakeFishUrl = new URL('../assets/fish/fake_fish.png', import.meta.url).href;
  const octo1Url = new URL('../assets/fish/octo1.png', import.meta.url).href;
  const coneSnailUrl = new URL('../assets/fish/cone.png', import.meta.url).href;
  const mechocto1Url = new URL('../assets/fish/mechocto1.png', import.meta.url).href;
  const kingBootUrl = new URL('../assets/fish/boot.png', import.meta.url).href;
  const godNephropidaeUrl = new URL('../assets/fish/godlobby.png', import.meta.url).href;
  const longEelUrl = new URL('../assets/fish/long_eel.png', import.meta.url).href;
  const fishingHookUrl = new URL('../assets/misc/hook.png', import.meta.url).href;
  const coralUrl = new URL('../assets/fish/coral.png', import.meta.url).href;
  const starfishUrl = new URL('../assets/fish/starfish.png', import.meta.url).href;
  const dmacExplosion1Url = new URL('../assets/vfx/dmac_explosion1.png', import.meta.url).href;
  const narutomakiItemUrl = new URL('../assets/items/narutomaki.png', import.meta.url).href;
  const hotsauceItemUrl = new URL('../assets/items/hotsauce.png', import.meta.url).href;
  const luckyNekoItemUrl = new URL('../assets/items/lucky.png', import.meta.url).href;
  return Promise.all([
    loadImage(arUrl),
    loadImage(shottyUrl),
    loadImage(revolverUrl),
    loadImage(pickupRevolverUrl),
    loadImage(muzzleUrl),
    loadImage(fishA),
    loadImage(fishB),
    loadImage(fishC),
    loadImage(oceanUrl),
    loadImage(shrimp1Url),
    loadImage(crab1Url),
    loadImage(crab2Url),
    loadImage(cray1Url),
    loadImage(jelly1Url),
    loadImage(clamUrl),
    loadImage(fakeFishUrl),
    loadImage(octo1Url),
    loadImage(coneSnailUrl),
    loadImage(mechocto1Url),
    loadImage(kingBootUrl),
    loadImage(godNephropidaeUrl),
    loadImage(longEelUrl),
    loadImage(fishingHookUrl),
    loadImage(coralUrl),
    loadImage(starfishUrl),
    loadImage(dmacExplosion1Url),
    loadImage(narutomakiItemUrl),
    loadImage(hotsauceItemUrl),
    loadImage(luckyNekoItemUrl),
  ]).then(([arImg, shottyImg, revolverImg, pickupRevolverImg, muzzleImg, aImg, bImg, cImg, oceanImg, shrimp1Img, crab1Img, crab2Img, cray1Img, jelly1Img, clamImg, fakeFishImg, octo1Img, coneSnailImg, mechocto1Img, kingBootImg, godNephropidaeImg, longEelImg, fishingHookImg, coralImg, starfishImg, dmacExplosion1Img, narutomakiItemImg, hotsauceItemImg, luckyNekoItemImg]) => {
    textures.ar = arImg;
    textures.shotty = shottyImg;
    textures.revolver = revolverImg;
    textures.pickup_revolver = pickupRevolverImg;
    textures.armuzzle = muzzleImg;
    textures.fish_a = aImg;
    textures.fish_b = bImg;
    textures.fish_c = cImg;
    textures.oceanBg = oceanImg;
    enemySprites.shrimp1 = shrimp1Img;
    enemySprites.crab1 = crab1Img;
    enemySprites.crab2 = crab2Img;
    enemySprites.cray1 = cray1Img;
    enemySprites.jelly1 = jelly1Img;
    enemySprites.clam = clamImg;
    enemySprites.fake_fish = fakeFishImg;
    enemySprites.octo1 = octo1Img;
    enemySprites.cone_snail = coneSnailImg;
    enemySprites.mechocto1 = mechocto1Img;
    enemySprites.king_boot = kingBootImg;
    enemySprites.god_nephropidae = godNephropidaeImg;
    enemySprites.long_eel = longEelImg;
    enemySprites.fishing_hook = fishingHookImg;
    enemySprites.coral = coralImg;
    enemySprites.starfish = starfishImg;
    vfxTextures.dmac_explosion1 = dmacExplosion1Img;
    itemTextures.health = narutomakiItemImg;
    itemTextures.hotsauce = hotsauceItemImg;
    itemTextures.lucky_neko = luckyNekoItemImg;
  });
}
