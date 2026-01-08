import { v4 as uuidv4 } from "uuid";

const buildFallbackRandom = () =>
  Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));

export const createUuid = () => {
  try {
    return uuidv4();
  } catch {
    return uuidv4({ random: buildFallbackRandom() });
  }
};
