// Exactly 256 words (indices 0–255) mapped 1:1 to Uint8Array random bytes.
// 5-word passphrase = 256^5 = 2^40 ≈ 1 trillion combinations (40 bits of entropy).
// Each word is short, common, and easy to type on mobile.
const WORDS: readonly string[] = [
  "arch","army","atom","aunt","back","ball","band","barn","base","bath", // 10
  "bear","bell","bike","bird","boat","body","bolt","bond","bone","book", // 20
  "boot","boss","bowl","brew","bush","cafe","cage","cake","call","camp", // 30
  "card","cart","cave","chip","city","clay","clip","club","coat","code", // 40
  "coin","comb","cord","corn","crab","crew","crop","crow","cube","cure", // 50
  "curl","dark","data","date","dawn","deal","deck","deer","desk","dial", // 60
  "dirt","disk","dive","dock","dome","door","dove","drag","draw","drop", // 70
  "drum","duck","dune","dusk","dust","duty","edge","epic","even","exit", // 80
  "face","fact","fall","farm","fast","fate","fear","feed","feel","file", // 90
  "film","fire","fish","flag","flat","flow","foam","fold","folk","font", // 100
  "ford","fork","form","fort","frog","fuel","fund","fuse","game","gate", // 110
  "gear","gift","girl","glow","glue","goal","gold","golf","gust","hand", // 120
  "hang","hard","harm","harp","hawk","heat","heel","helm","herb","hero", // 130
  "hill","hint","hive","hold","hole","home","hook","hope","horn","host", // 140
  "hull","hunt","idea","iron","isle","item","jade","jazz","join","joke", // 150
  "jump","keen","kind","king","knot","lace","lake","lamp","land","lane", // 160
  "lark","lava","lead","leaf","lean","leap","lens","life","lift","lime", // 170
  "line","link","lion","list","loft","loop","lord","lore","loss","lure", // 180
  "mail","main","mane","mark","mask","mast","maze","meal","melt","mesh", // 190
  "mile","mill","mint","mist","mode","mole","mood","moon","moor","moss", // 200
  "moth","musk","nail","navy","nest","news","node","nook","norm","note", // 210
  "oath","orb","page","palm","park","path","peak","pear","peel","pier",  // 220
  "pine","plan","plug","pond","pool","port","post","pull","pump","pure", // 230
  "rain","rake","rank","reed","reef","reel","rice","ride","ring","rise", // 240
  "risk","road","rock","role","roof","root","rose","rune","rust","sage", // 250
  "sail","salt","sand","seal","seed","ship",                             // 256
] as const;

if (WORDS.length !== 256) {
  throw new Error(`wordlist must have exactly 256 entries, got ${WORDS.length}`);
}

// 5 words by default: 256^5 = 2^40 ≈ 40 bits of passphrase entropy.
export function generatePassphrase(wordCount = 5): string {
  const indices = new Uint8Array(wordCount);
  crypto.getRandomValues(indices);
  return Array.from(indices).map((i) => WORDS[i]).join("-");
}
