"use strict";
/* ============================================================
   SPELL RACERS — content
   Worlds of Karnataka, words (meaning · Kannada · picture · sentence · riddle),
   power words, hazards, runners and cosmetics. Pure data, no logic.
   ============================================================ */

/* Power words. Spell one with letter coins, then tap it to cast.
   tgt: self = helps you, rival = hits the racer just ahead of you (or just behind if you lead). */
const POWERS={
  RUSH:     {m:"to hurry",               k:"ಅವಸರ",          eff:"Turbo boost",              icon:"⚡", tgt:"self",  col:"#FFB020"},
  SOAR:     {m:"to fly high in the air", k:"ಮೇಲೆ ಹಾರು",      eff:"Float over everything",     icon:"🪽", tgt:"self",  col:"#5CC8FF"},
  ATTRACT:  {m:"to pull towards you",    k:"ಆಕರ್ಷಿಸು",        eff:"Letter magnet",            icon:"🧲", tgt:"self",  col:"#FF5C8A"},
  CONFIDENT:{m:"sure of yourself",       k:"ಆತ್ಮವಿಶ್ವಾಸ",      eff:"Shield blocks one hit",     icon:"🛡️", tgt:"self",  col:"#2BD49A"},
  MANAGE:   {m:"to handle a problem",    k:"ನಿಭಾಯಿಸು",        eff:"Clears all slowdowns",      icon:"🧰", tgt:"self",  col:"#8FD14F"},
  AWKWARD:  {m:"embarrassed",            k:"ಮುಜುಗರ",          eff:"Rival trips over",          icon:"🙈", tgt:"rival", col:"#FF6B4A"},
  EXHAUSTED:{m:"very tired",             k:"ತುಂಬಾ ಸುಸ್ತು",     eff:"Rival slows down",          icon:"😩", tgt:"rival", col:"#B57BFF"},
  NERVOUS:  {m:"worried, scared",        k:"ಆತಂಕ",            eff:"Rival's jumps go weak",     icon:"😰", tgt:"rival", col:"#FF8FD0"}
};

/* Worlds. sky: 4 sections × [top, horizon]. pal: art palette for the procedural scenery. */
const WORLDS=[
 {id:"blr",name:"Bengaluru",kn:"ಬೆಂಗಳೂರು",e:"🏙️",theme:"city",tag:"The Garden City",
  story:"Race from Majestic through MG Road and the Silk Board jam to Lalbagh.",
  secs:[["Majestic","Majestic bus stand. Go!"],["MG Road","MG Road. Street dogs ahead!"],["Silk Board","Silk Board. Total traffic jam!"],["Lalbagh","Lalbagh at sunset!"]],
  sky:[["#58B7F0","#FFE9C2"],["#3FA4EA","#D8F1FF"],["#8C9DBA","#F0DCC0"],["#E9785A","#FFD49A"]],
  pal:{far:"#8FA9CF",mid:["#E7B66B","#D98F5B","#B9C7DA","#9AB0D0"],near:"#3F5A48",ground:["#4C4560","#2E2840"],edge:"#C9C3D3",accent:"#FFC531"},
  pool:{jump:["pothole","barricade","cone","auto","cow","dog"],duck:["pigeons","banner"],slow:["puddle"]},
  boss:"Traffic Rakshasa",
  words:[["curious","wanting to know","ಕುತೂಹಲ","🔍🤔"],["patient","able to wait calmly","ತಾಳ್ಮೆ","⏳🧘‍♀️"],["grateful","thankful","ಕೃತಜ್ಞತೆ","🙏💐"],["postpone","to move to a later time","ಮುಂದೂಡು","📅➡️"],["delighted","very happy","ತುಂಬಾ ಖುಷಿ","🎁😄"],["crowded","full of people","ಜನಸಂದಣಿ","👥👥👥"],["reliable","can be trusted","ನಂಬಿಕೆಗೆ ಅರ್ಹ","🤝✅"],["hesitate","to pause before acting","ಹಿಂಜರಿಯು","🚪😬"]]},
 {id:"mys",name:"Mysuru",kn:"ಮೈಸೂರು",e:"🏰",theme:"palace",tag:"City of Palaces",
  story:"Dasara time! Dash past elephants and flower stalls to the glowing palace.",
  secs:[["Devaraja Market","Devaraja Market. Flowers everywhere!"],["Palace Road","Palace Road. Elephants on parade!"],["Dasara Lights","The palace lights are on!"],["Chamundi Hills","Climb to Chamundi Hills!"]],
  sky:[["#6CC0F0","#FFE6C0"],["#4FAEEA","#FFDDB0"],["#2A1F5E","#E98A6A"],["#F09A55","#FFE0A8"]],
  pal:{far:"#C99A80",mid:["#F2C14E","#E8A44A","#F7D79A","#E9B872"],near:"#7A3A2A",ground:["#A3523A","#6E3426"],edge:"#E8C9A0",accent:"#FF5C8A"},
  pool:{jump:["elephant","cow","barricade","cone","flowercart"],duck:["pigeons","garland"],slow:["puddle"]},
  boss:"Palace Phantom",
  words:[["magnificent","very beautiful and grand","ಭವ್ಯ","🏰✨"],["celebrate","to enjoy a special day","ಆಚರಿಸು","🎉🪔"],["decorate","to make something beautiful","ಅಲಂಕರಿಸು","🎀💡"],["delicious","very tasty","ರುಚಿಕರ","😋🍬"],["ancient","very, very old","ಪ್ರಾಚೀನ","🏺📜"],["proud","happy about what you did","ಹೆಮ್ಮೆ","🏆😊"],["generous","happy to give to others","ಉದಾರ","👵🍬"],["fragile","breaks easily","ಸುಲಭವಾಗಿ ಒಡೆಯುವ","🥚⚠️"]]},
 {id:"crg",name:"Coorg",kn:"ಕೊಡಗು",e:"🌲",theme:"forest",tag:"Scotland of India",
  story:"Misty hills and coffee estates. Watch for monkeys and bees in the forest.",
  secs:[["Coffee Estate","Coffee estate. Smell that coffee!"],["Misty Hills","Misty hills. Hard to see!"],["Rain Forest","Rain forest. Muddy paths!"],["Abbey Falls","Almost at Abbey Falls!"]],
  sky:[["#8ECFE6","#E6F6EC"],["#AFC4CE","#EEF2EF"],["#6F9AA8","#D2E6DA"],["#7FCBE6","#E6F7F0"]],
  pal:{far:"#7FA88F",mid:["#3E7D4E","#2F6B40","#5A9A63","#48885A"],near:"#24502F",ground:["#7A5434","#4F331C"],edge:"#6FB65A",accent:"#8FD14F"},
  pool:{jump:["log","rock","monkey","stump"],duck:["bees","branch"],slow:["mud","puddle"]},
  boss:"Mist Monster",
  words:[["misty","full of light fog","ಮಂಜಿನ","🌫️⛰️"],["peaceful","calm and quiet","ಶಾಂತ","🧘🌿"],["drenched","completely wet","ತೊಯ್ದ","🌧️😖"],["shiver","to shake with cold","ನಡುಗು","🥶"],["explore","to go and discover","ಅನ್ವೇಷಿಸು","🧭🗺️"],["fragrant","smells very nice","ಸುವಾಸನೆಯ","🌸👃"],["brave","not afraid","ಧೈರ್ಯಶಾಲಿ","🦁💪"],["slippery","easy to slip on","ಜಾರುವ","🍌😵"]]},
 {id:"hmp",name:"Hampi",kn:"ಹಂಪಿ",e:"🛕",theme:"ruins",tag:"The Stone Kingdom",
  story:"Giant boulders and ancient temples. The rocks here like to roll!",
  secs:[["Virupaksha","Virupaksha temple street."],["Boulder Hills","Boulder hills. Rolling rocks!"],["Stone Chariot","The famous stone chariot!"],["Tungabhadra","Down to the Tungabhadra river!"]],
  sky:[["#F5BE72","#FFF0D0"],["#EFA95E","#FFE4B8"],["#E28A50","#FFD6A0"],["#7BC0E6","#FFEAC8"]],
  pal:{far:"#C98F5E",mid:["#C9935B","#B67D48","#D9A974","#C58A55"],near:"#7E5432",ground:["#B88456","#8A5C34"],edge:"#E3C08E",accent:"#FF9A3C"},
  pool:{jump:["boulder","rock","monkey","pillar"],duck:["bats","arch"],slow:["puddle"]},
  boss:"Stone Giant",
  words:[["ruins","broken old buildings","ಅವಶೇಷಗಳು","🏚️🧱"],["enormous","very, very big","ಬೃಹತ್","🐘⛰️"],["carve","to cut shapes into stone","ಕೆತ್ತು","🗿🔨"],["wander","to walk around with no plan","ಅಲೆದಾಡು","🚶‍♀️🌄"],["scorching","very, very hot","ಸುಡುವ","☀️🥵"],["mysterious","strange and secret","ನಿಗೂಢ","🕵️❓"],["fascinated","very interested","ಆಕರ್ಷಿತ","🤩📸"],["balance","to stay steady","ಸಮತೋಲನ","🤸⚖️"]]},
 {id:"jog",name:"Jog Falls",kn:"ಜೋಗ ಜಲಪಾತ",e:"💧",theme:"falls",tag:"The Roaring Falls",
  story:"The final race to India's great waterfall. Crabs, spray and steep rocks!",
  secs:[["Forest Trail","The forest trail to the falls."],["Viewpoint","The viewpoint. Hear that roar!"],["Spray Zone","Spray zone. Everything is wet!"],["The Falls","The bottom of the falls!"]],
  sky:[["#6EC6EF","#E6F8FF"],["#56B6EA","#D8F2FF"],["#9CD2EA","#F0FAFF"],["#5FBCEA","#DFF5FF"]],
  pal:{far:"#6E8F86",mid:["#557A6E","#476B60","#6A8F82","#5E8578"],near:"#2E4A40",ground:["#5E6E78","#3A464D"],edge:"#8FD3E8",accent:"#5CC8FF"},
  pool:{jump:["rock","crab","log","boulder"],duck:["pigeons","branch"],slow:["puddle"]},
  boss:"Waterfall Wyrm",
  words:[["breathtaking","so beautiful it amazes you","ಅದ್ಭುತ","🌈😮"],["roar","a loud, deep sound","ಗರ್ಜನೆ","🦁🔊"],["steep","going up or down sharply","ಕಡಿದಾದ","⛰️📐"],["cautious","careful","ಎಚ್ಚರಿಕೆಯ","⚠️🚶"],["thrilled","very excited","ರೋಮಾಂಚಿತ","🎢😆"],["vast","very wide and big","ವಿಶಾಲ","🌊🏞️"],["glimpse","a quick look","ಕ್ಷಣದ ನೋಟ","👀⚡"],["achieve","to succeed after hard work","ಸಾಧಿಸು","🏁🏆"]]}
];

const SENT={"curious": "The child was ___ and asked many questions.", "patient": "Please be ___. The bus will come soon.", "grateful": "I am ___ for your help.", "postpone": "It is raining, so let's ___ the picnic.", "delighted": "She was ___ to get a surprise gift.", "crowded": "The metro was so ___ that I had to stand.", "reliable": "He always comes on time. He is very ___.", "hesitate": "Don't ___ to ask the teacher a question.", "magnificent": "The palace looks ___ with all its lights.", "celebrate": "We ___ Dasara with our family.", "decorate": "Let's ___ the house with flowers.", "delicious": "Mysore pak is sweet and ___.", "ancient": "This temple is ___. It is 800 years old.", "proud": "My parents were ___ of my results.", "generous": "The ___ lady gave sweets to everyone.", "fragile": "Carry the glass slowly. It is ___.", "misty": "In the morning the hills are cool and ___.", "peaceful": "The forest was quiet and ___.", "drenched": "I forgot my umbrella and got ___.", "shiver": "It was so cold that I started to ___.", "explore": "Let's ___ the coffee estate together.", "fragrant": "The jasmine flowers are very ___.", "brave": "The ___ girl walked alone through the dark forest.", "slippery": "Be careful, the wet rocks are ___.", "ruins": "We walked through the ___ of an old city.", "enormous": "The boulder was ___, bigger than a bus.", "carve": "Artists used to ___ statues out of stone.", "wander": "We like to ___ around the old streets.", "scorching": "At noon the sun was ___.", "mysterious": "Nobody knows who built it. It is ___.", "fascinated": "I was ___ by the stone chariot.", "balance": "The big rock seems to ___ on a small one.", "breathtaking": "The view of the waterfall was ___.", "roar": "We could hear the ___ of the water.", "steep": "The path down to the falls is very ___.", "cautious": "Be ___ near the edge.", "thrilled": "We were ___ to see a rainbow.", "vast": "The forest is ___ and goes on for miles.", "glimpse": "I caught a ___ of a deer in the trees.", "achieve": "If you practise every day, you will ___ your goal."};
const RIDDLE={"curious": "I make children ask 'why?' a hundred times. When you want to know everything, you feel…", "patient": "The bus is late and the queue is long, but you stay calm and wait without complaining. You are…", "grateful": "A stranger helps you carry your heavy bags. You say 'thank you' from your heart. You feel…", "postpone": "Rain stops the cricket match, so they move it to next Sunday. What do they do to the match?", "delighted": "Your best friend brings you a surprise birthday cake. You're not just happy, you are…", "crowded": "So many people are in the metro that you can't even move your arms. The metro is…", "reliable": "Your friend keeps every promise and is always on time. You can always trust her. She is…", "hesitate": "You want to ask a question, but you stop for a moment because you're not sure. You…", "magnificent": "The palace glows with thousands of bulbs. It is huge, grand and beautiful. It looks…", "celebrate": "On Dasara you light lamps, wear new clothes and share sweets with family. You…", "decorate": "You hang flowers and lights on the door to make the house look beautiful. You…", "delicious": "One bite of Mysore pak and you say 'Mmm, so tasty!' It is…", "ancient": "This temple was built a thousand years ago, long before your great-grandparents. It is…", "proud": "You came first in the race. You stand tall and smile at your family. You feel…", "generous": "Your neighbour shares her food with everyone and never asks for anything back. She is…", "fragile": "Handle with care! This glass vase can break with one small knock. It is…", "misty": "In the morning you can't see the hills because of soft white fog. The hills are…", "peaceful": "No horns and no noise. Only birds singing and wind in the trees. The place feels…", "drenched": "You walked in heavy rain with no umbrella. Every bit of you is wet. You are…", "shiver": "It's so cold that your whole body shakes and your teeth chatter. You…", "explore": "You walk into a new forest just to see what's there and find new places. You…", "fragrant": "Jasmine and coffee flowers fill the air with a lovely smell. They are…", "brave": "There's a scary noise in the dark, but you walk forward without fear. You are…", "slippery": "The rock is wet and covered in moss. Your feet slide on it. It is…", "ruins": "Broken walls and fallen pillars are all that's left of a great old city. They are the…", "enormous": "This boulder is bigger than a house! It is…", "carve": "With a hammer and chisel, the artist cuts a statue out of solid stone. He…", "wander": "You stroll around the old streets with no map and no plan, just looking. You…", "scorching": "At noon the sun is so hot that the rocks burn your feet. The heat is…", "mysterious": "Nobody knows who made this strange carving, or why. It is…", "fascinated": "You can't stop looking at the stone chariot. It holds all your attention. You are…", "balance": "A giant rock stands on a tiny rock and never falls. It keeps its…", "breathtaking": "You see the waterfall and you can't even speak. It's that beautiful. The view is…", "roar": "The waterfall makes a loud, deep sound, like a lion. That sound is a…", "steep": "The path goes down so sharply that you must hold the railing. It is…", "cautious": "Near the cliff edge, you walk slowly and carefully. You are being…", "thrilled": "You're about to see the falls for the first time and you can't stop jumping. You are…", "vast": "The forest goes on and on, as far as your eyes can see. It is…", "glimpse": "A deer appears between the trees for one second, then it's gone. You caught a…", "achieve": "You practised every single day, and finally you won the trophy. You…"};

WORLDS.forEach(w=>w.words=w.words.map(([a,m,k,p])=>({a,m,k,p,s:SENT[a],r:RIDDLE[a]})));
const GATE_AT=[.25,.5,.75];

/* Hazards (sizes in world units, measured from the ground up).
   jump = red tag, hop over it.  duck = purple tag, slide under it.  slow = blue, only slows you. */
const HZ={
  pothole:   {kind:"jump",w:22,h:8,  msg:"Pothole!"},
  barricade: {kind:"jump",w:24,h:42, msg:"Bonk!"},
  cone:      {kind:"jump",w:12,h:28, msg:"Oops!"},
  auto:      {kind:"jump",w:30,h:46, msg:"Beep beep!"},
  cow:       {kind:"jump",w:30,h:46, msg:"Moo!"},
  dog:       {kind:"jump",w:18,h:28, move:.45, msg:"Woof!"},
  elephant:  {kind:"jump",w:34,h:58, msg:"Huge!"},
  flowercart:{kind:"jump",w:28,h:40, msg:"Flowers!"},
  log:       {kind:"jump",w:28,h:22, msg:"Tripped!"},
  stump:     {kind:"jump",w:16,h:30, msg:"Stump!"},
  rock:      {kind:"jump",w:22,h:28, msg:"Rock!"},
  monkey:    {kind:"jump",w:16,h:30, move:.55, msg:"Cheeky!"},
  crab:      {kind:"jump",w:16,h:20, move:.4, msg:"Pinch!"},
  boulder:   {kind:"jump",w:22,h:44, move:.85, msg:"Rolling rock!"},
  pillar:    {kind:"jump",w:16,h:36, msg:"Pillar!"},
  pigeons:   {kind:"duck",w:34,lo:40, msg:"Flap!"},
  bees:      {kind:"duck",w:34,lo:40, msg:"Buzz!"},
  bats:      {kind:"duck",w:34,lo:40, msg:"Eek!"},
  banner:    {kind:"duck",w:30,lo:40, msg:"Banner!"},
  garland:   {kind:"duck",w:30,lo:40, msg:"Garland!"},
  branch:    {kind:"duck",w:30,lo:40, msg:"Branch!"},
  arch:      {kind:"duck",w:26,lo:40, msg:"Low arch!"},
  puddle:    {kind:"slow",w:32, msg:"Splash!"},
  mud:       {kind:"slow",w:34, msg:"Muddy!"}
};

/* Runners: original characters, purely cosmetic (all run at the same speed). */
const RUNNERS=[
  {id:"mithra",name:"Mithra",kn:"ಮಿತ್ರ",species:"hare",    cost:0,   bio:"A quick white hare who never forgets a word.",
   fur:"#F4EFE8",fur2:"#D9CFC4",belly:"#FFFFFF",inner:"#FF9DB5",eye:"#2B6FD8",top:"#17B3A3",top2:"#0E8C80",acc:"#FF8A1F",shoe:"#FF4E6B"},
  {id:"chiku",name:"Chiku",kn:"ಚಿಕು",species:"squirrel",  cost:0,   bio:"A palm squirrel with three lucky stripes.",
   fur:"#A98466",fur2:"#7E5E45",belly:"#F2DEC6",inner:"#E8A890",eye:"#3A2A1E",top:"#E8384F",top2:"#B82238",acc:"#FFD23F",shoe:"#3E7BFA"},
  {id:"raja",  name:"Raja",  kn:"ರಾಜ",  species:"tiger",   cost:400, bio:"A tiger cub from Bandipur with a royal roar.",
   fur:"#FF9A2E",fur2:"#E07514",belly:"#FFF4E2",inner:"#FFB7A0",eye:"#2E9E5B",top:"#3A3F9E",top2:"#272B78",acc:"#FFD23F",shoe:"#FFFFFF"},
  {id:"gaja",  name:"Gaja",  kn:"ಗಜ",   species:"elephant", cost:800, bio:"A Dasara elephant calf in festival finery.",
   fur:"#9AA7BD",fur2:"#7A869C",belly:"#B6C1D3",inner:"#F2A7B8",eye:"#2A2140",top:"#C2185B",top2:"#8E0E42",acc:"#FFC531",shoe:"#FFC531"},
  {id:"neela", name:"Neela", kn:"ನೀಲ",  species:"peacock",  cost:1200,bio:"A peacock chick with a tail full of colour.",
   fur:"#2F6FE0",fur2:"#1E4FB0",belly:"#5FA3FF",inner:"#FFD23F",eye:"#1B1530",top:"#20C3A0",top2:"#128A72",acc:"#FFD23F",shoe:"#FFB020"}
];
const TRAILS=[
  {id:"dust",   name:"Dust",      cost:0,   cols:["rgba(255,255,255,.75)"]},
  {id:"spark",  name:"Sparkles",  cost:150, cols:["#FFE27A","#FFFFFF","#FFC531"]},
  {id:"petal",  name:"Marigold",  cost:300, cols:["#FF9F1C","#FFBF3C","#FF6B00"]},
  {id:"rainbow",name:"Rainbow",   cost:500, cols:["#FF4E6B","#FFB020","#FFE14D","#2BD49A","#3EA2FF","#9B6BFF"]},
  {id:"flame",  name:"Comet",     cost:700, cols:["#FF5A1F","#FFB020","#FFF1A0"]}
];
const BOT_NAMES=["Arjun","Meera","Kavya","Rohan","Ananya","Vikram","Tara","Kiran","Diya","Nikhil"];

const ACHIEVEMENTS=[
  {id:"first",  icon:"🏁",name:"First Finish",   desc:"Finish your first race"},
  {id:"win",    icon:"🥇",name:"Champion",       desc:"Win a race"},
  {id:"gates3", icon:"🚪",name:"Gatekeeper",     desc:"Pass all 3 gates in one race"},
  {id:"lamps3", icon:"🪔",name:"Lamp Lighter",   desc:"Light all 3 of Yaksharaj's lamps"},
  {id:"spell10",icon:"✨",name:"Spellslinger",   desc:"Cast 10 power words"},
  {id:"words25",icon:"📖",name:"Word Collector", desc:"Discover 25 words"},
  {id:"master10",icon:"🎓",name:"Word Master",   desc:"Fully master 10 words"},
  {id:"streak3",icon:"🔥",name:"On Fire",        desc:"Play 3 days in a row"},
  {id:"flawless",icon:"💎",name:"Flawless",      desc:"Finish a race without getting hit"},
  {id:"allworlds",icon:"🗺️",name:"Karnataka Explorer",desc:"Earn a star in every world"}
];
