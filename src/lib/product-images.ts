import bread from "@/assets/bread.jpg";
import led from "@/assets/led-gift.jpg";
import speaker from "@/assets/speaker.jpg";

const images: Record<string, string> = { "generated:bread": bread, "generated:led": led, "generated:speaker": speaker };
export function productImage(url: string | null) { return url ? images[url] ?? url : undefined; }