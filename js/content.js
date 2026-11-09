"use strict";
/* ============================================================
   ENDLESS CONTENT
   · PLACES — 20 places across Karnataka (each one is a race track look)
   · PACKS  — themed word packs, ordered from easy to harder
   · LEVEL(n) — level n = a place (cycling) + a word pack.
     After the last pack, levels become Review Tours built from the
     words you know least, so the journey never ends.
   Add a place or a pack here and it simply appears in the game.
   ============================================================ */

/* ---------- places ---------- */
const SKY={
  day:[["#58B7F0","#FFE9C2"],["#3FA4EA","#D8F1FF"],["#6CB8E8","#E8F4FF"],["#E9785A","#FFD49A"]],
  coast:[["#4FB8F0","#FFF0CF"],["#38A8E8","#E0F6FF"],["#5CC0EE","#FFF4D8"],["#F07A5A","#FFD9A0"]],
  green:[["#8ECFE6","#E6F6EC"],["#9CC8D8","#EEF4EE"],["#6F9AA8","#D2E6DA"],["#7FCBE6","#E6F7F0"]],
  warm:[["#F5BE72","#FFF0D0"],["#EFA95E","#FFE4B8"],["#E28A50","#FFD6A0"],["#7BC0E6","#FFEAC8"]],
  dusk:[["#6CC0F0","#FFE6C0"],["#4FAEEA","#FFDDB0"],["#2A1F5E","#E98A6A"],["#F09A55","#FFE0A8"]],
  monsoon:[["#7FA8C0","#DDE8EC"],["#6A94AE","#D4E2E8"],["#5D879E","#C9DCE2"],["#8FC4DE","#E8F4F6"]]
};
const THEME_POOL={
  city:{jump:["pothole","barricade","cone","auto","cow","dog"],duck:["pigeons","banner"],slow:["puddle"]},
  palace:{jump:["elephant","cow","barricade","cone","flowercart"],duck:["pigeons","garland"],slow:["puddle"]},
  forest:{jump:["log","rock","monkey","stump"],duck:["bees","branch"],slow:["mud","puddle"]},
  ruins:{jump:["boulder","rock","monkey","pillar"],duck:["bats","arch"],slow:["puddle"]},
  falls:{jump:["rock","crab","log","boulder"],duck:["pigeons","branch"],slow:["puddle"]},
  coast:{jump:["crab","boat","rock","log"],duck:["gulls","frond"],slow:["puddle"]}
};
const NEW_PLACES=[
 ["udp","Udupi","ಉಡುಪಿ","🏖️","coast","Temple Town by the Sea","Run along Malpe beach, dodge fishing boats and head to the temple for a masala dosa.",
  ["Malpe Beach","St Mary's Jetty","Fish Market","Car Street"],"coast",{far:"#6FB0CC",mid:["#E8B46A","#D9744F","#F2D6A0","#9BC9B0"],near:"#2E6B4A",ground:["#E2C48A","#B99258"],edge:"#F7E6B8",accent:"#FF8A1F"}],
 ["ckm","Chikkamagaluru","ಚಿಕ್ಕಮಗಳೂರು","☕","forest","Land of Coffee","Climb through coffee estates to the highest peak in Karnataka.",
  ["Coffee Estate","Baba Budangiri","Mullayanagiri","Hebbe Falls"],"green",{far:"#86A894",mid:["#3E7D4E","#2F6B40","#6AA06A","#4C8A5C"],near:"#244A2E",ground:["#80583A","#55381F"],edge:"#7BBE5E",accent:"#A0522D"}],
 ["bdm","Badami","ಬಾದಾಮಿ","🪨","ruins","The Red Rock Caves","Race past red sandstone cliffs and caves carved by the Chalukya kings.",
  ["Cave Temples","Agastya Lake","Red Cliffs","North Fort"],"warm",{far:"#C0705A",mid:["#C25E42","#A84E36","#D98060","#B86A4C"],near:"#6E3424",ground:["#B5634A","#86422E"],edge:"#E8A884",accent:"#FF6B3C"}],
 ["mng","Mangaluru","ಮಂಗಳೂರು","⚓","coast","The Port City","A busy port with ships, fish curry and the Arabian Sea breeze.",
  ["Old Port","Panambur Beach","Kadri Hills","Tannirbhavi"],"coast",{far:"#5AA6C6",mid:["#D96B4F","#E8C06A","#7FB8C8","#C9A27A"],near:"#2A5A44",ground:["#D9BB82","#AE8A52"],edge:"#F2E0B0",accent:"#3EA2FF"}],
 ["bnd","Bandipur","ಬಂಡೀಪುರ","🐅","forest","Tiger Reserve","A jungle safari race. Elephants, monkeys and maybe a tiger!",
  ["Forest Gate","Teak Woods","Watering Hole","Gopalaswamy Hill"],"green",{far:"#9AAE7A",mid:["#5E8A3E","#4A7430","#7FA052","#6B8F44"],near:"#2F4A1E",ground:["#8E6A40","#5E4426"],edge:"#A8C46A",accent:"#FFB020"}],
 ["srp","Srirangapatna","ಶ್ರೀರಂಗಪಟ್ಟಣ","🏯","palace","The Island Fort","A fort on an island in the Kaveri river, full of old cannons and gates.",
  ["Fort Gate","Daria Daulat","Kaveri Bank","Ranganathaswamy"],"day",{far:"#B39A7A",mid:["#E3C27A","#C99A5A","#EBD6A8","#D8B070"],near:"#5E4A2A",ground:["#9C6A44","#6A4428"],edge:"#E2C69A",accent:"#2BD49A"}],
 ["gok","Gokarna","ಗೋಕರ್ಣ","🌅","coast","Beaches & Cliffs","Cliff paths link five beautiful beaches. Watch the waves!",
  ["Main Beach","Kudle Beach","Om Beach","Paradise Beach"],"coast",{far:"#4F9EC0",mid:["#8A7A5A","#6E8F5A","#C9A86A","#9B8B6A"],near:"#2E5A3A",ground:["#E8CC92","#BC9A5E"],edge:"#FAEBC0",accent:"#FF5C8A"}],
 ["blh","Belur & Halebidu","ಬೇಲೂರು ಹಳೇಬೀಡು","🛕","ruins","Temples of Stone Lace","The Hoysala temples have the finest stone carvings in the world.",
  ["Chennakeshava","Stone Dancers","Hoysaleswara","Nandi Mantapa"],"warm",{far:"#9C8E7E",mid:["#8E8070","#A89884","#7A6E60","#B5A48C"],near:"#4A4034",ground:["#8E7A62","#665642"],edge:"#CBBBA2",accent:"#B57BFF"}],
 ["hbl","Hubballi","ಹುಬ್ಬಳ್ಳಿ","🚉","city","The Railway Hub","Dash through a busy railway town, markets and long platforms.",
  ["Railway Station","Durgada Bail","Unkal Lake","Nrupatunga Hill"],"day",{far:"#9AA8C8",mid:["#D98F5B","#B9C7DA","#E7B66B","#C27A5A"],near:"#3F5A48",ground:["#565068","#36304A"],edge:"#CFC9D9",accent:"#FF5C8A"}],
 ["ndh","Nandi Hills","ನಂದಿ ಬೆಟ್ಟ","🌄","forest","Above the Clouds","Race up the hill at sunrise and run above the clouds.",
  ["Hill Road","Hairpin Bends","Tipu's Drop","Sunrise Point"],"monsoon",{far:"#A2B4C2",mid:["#5A8A6A","#4A7A5A","#7AA084","#6A9474"],near:"#2A4A36",ground:["#6E6050","#4A4034"],edge:"#9CC48A",accent:"#FFC531"}],
 ["mrd","Murudeshwar","ಮುರುಡೇಶ್ವರ","🗿","coast","The Giant Shiva by the Sea","A huge statue stands by the sea. Run along the beach and the jetty.",
  ["Beach Road","The Jetty","Temple Tower","Netrani View"],"coast",{far:"#5CA8CC",mid:["#E8A04A","#D9C08A","#6AAFC0","#E8B46A"],near:"#2A5A44",ground:["#E0C080","#B48E50"],edge:"#F8E6B4",accent:"#FFB020"}],
 ["vjp","Vijayapura","ವಿಜಯಪುರ","🕌","palace","City of Domes","Home of the giant Gol Gumbaz dome. Whisper and it echoes back!",
  ["Gol Gumbaz","Ibrahim Rauza","Bara Kaman","Malik-e-Maidan"],"warm",{far:"#C8A884",mid:["#D9BC8C","#C4A070","#E8D2A8","#B89064"],near:"#5E4A32",ground:["#B08A5A","#80603C"],edge:"#E8D0A0",accent:"#2BD49A"}],
 ["dnd","Dandeli","ದಾಂಡೇಲಿ","🛶","falls","River Adventure","Rapids, rafts and thick forest along the Kali river.",
  ["Kali River","Rapids","Syntheri Rocks","Supa Dam"],"green",{far:"#6A9A84",mid:["#3E7A5A","#2F6A4A","#5A9070","#4A8060"],near:"#244A36",ground:["#5A6A62","#3A4842"],edge:"#7FC8B8",accent:"#5CC8FF"}],
 ["agm","Agumbe","ಆಗುಂಬೆ","🌧️","forest","Cherrapunji of the South","The rainiest place in the South. Bring an umbrella!",
  ["Rain Forest","Sunset Point","Barkana Falls","Ghat Road"],"monsoon",{far:"#6E9480",mid:["#2F6B40","#3E7D4E","#245A34","#4A8A5A"],near:"#1C3E26",ground:["#6A4C30","#44301C"],edge:"#5AA04A",accent:"#8FD14F"}],
 ["bdr","Bidar","ಬೀದರ್","🏰","ruins","The Old Fort City","A great old fort with long walls, gates and secret tunnels.",
  ["Fort Walls","Rangin Mahal","Madrasa","Karez Tunnels"],"warm",{far:"#A88070","mid":["#9A6A5A","#B07A64","#8A5A4C","#C08A72"],near:"#4E3428",ground:["#8E5E4A","#644032"],edge:"#D2A48C",accent:"#FF9A3C"}],
 ["kbn","Kabini","ಕಬಿನಿ","🐘","falls","Elephant River","Wild elephants gather by the river. Stay quiet and run fast!",
  ["Backwaters","Elephant Corridor","Boat Jetty","Sunset Banks"],"day",{far:"#7A9A8A",mid:["#4E7A5E","#3E6A4E","#6A8E70","#5A8464"],near:"#2A4636",ground:["#6A6458","#4A443A"],edge:"#9CC8A8",accent:"#FFC531"}],
 ["blg","Belagavi","ಬೆಳಗಾವಿ","🍬","city","Home of Kunda","A city of forts and gardens, famous for its sweet kunda.",
  ["Fort Road","Kapileshwar","Market Lane","Rajhans Gad"],"dusk",{far:"#A49ABA",mid:["#C27A5A","#E7B66B","#9AB0D0","#D98F5B"],near:"#3F4A58",ground:["#4E4860","#2E2840"],edge:"#C9C3D3",accent:"#FF8A1F"}],
 ["svb","Shravanabelagola","ಶ್ರವಣಬೆಳಗೊಳ","🙏","ruins","The Hill of the Giant Statue","Climb 600 steps to the giant statue of Gommateshwara.",
  ["Town Pond","Rock Steps","Chandragiri","Hilltop"],"day",{far:"#A8A094","mid":["#B8AE9E","#A09684","#C8C0B0","#8E8676"],near:"#4E4840",ground:["#8A8070","#62594C"],edge:"#D4CCBC",accent:"#FFC531"}]
].map(([id,name,kn,e,theme,tag,story,secs,sky,pal])=>({id,name,kn,e,theme,tag,story,secs:secs.map(s=>[s,s+"!"]),sky:SKY[sky],pal,pool:THEME_POOL[theme],night:-1}));

const PLACES=WORLDS.map(w=>({...w,night:w.theme==="palace"?2:-1})).concat(NEW_PLACES);

/* ---------- word packs (word | meaning | Kannada | picture | sentence) ---------- */
const PACK_SRC=[
["Feelings",`cheerful|happy and bright|ಹರ್ಷಚಿತ್ತ|😊🌞|Our ___ teacher always smiles at us.
lonely|sad because you are alone|ಒಂಟಿಯಾದ|🧍🌧️|The new boy felt ___ on his first day.
furious|very, very angry|ತುಂಬಾ ಕೋಪಗೊಂಡ|😡🔥|Dad was ___ when the window broke.
jealous|wanting what someone else has|ಹೊಟ್ಟೆಕಿಚ್ಚಿನ|😒💚|He felt ___ of his friend's new bicycle.
calm|quiet and not worried|ಶಾಂತವಾದ|😌🌊|Take a deep breath and stay ___.
surprised|feeling that something unexpected happened|ಆಶ್ಚರ್ಯಗೊಂಡ|😲🎉|I was ___ to see a peacock on our roof.
ashamed|feeling bad about something you did|ನಾಚಿಕೆಗೊಂಡ|😳🙈|She felt ___ after telling a lie.
hopeful|believing good things will happen|ಭರವಸೆಯುಳ್ಳ|🌱🙏|The farmer is ___ that it will rain soon.`],
["Weather",`drizzle|light, gentle rain|ತುಂತುರು ಮಳೆ|🌦️💧|A light ___ fell on the playground.
thunder|the loud sound in a storm|ಗುಡುಗು|⛈️🔊|The ___ was so loud that the baby cried.
lightning|a bright flash of light in a storm|ಮಿಂಚು|⚡🌩️|We saw ___ light up the night sky.
humid|hot and damp air|ಆರ್ದ್ರ|🥵💦|Mangaluru is hot and ___ in summer.
breeze|a soft, cool wind|ತಂಗಾಳಿ|🍃🌬️|A cool ___ came from the sea.
flood|too much water covering the land|ಪ್ರವಾಹ|🌊🏠|The heavy rain caused a ___ in the village.
drought|a long time with no rain|ಬರಗಾಲ|🏜️☀️|Many crops die during a ___.
forecast|what the weather is expected to be|ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ|📺🌤️|The ___ says it will rain tomorrow.`],
["Food",`spicy|hot with chilli|ಖಾರವಾದ|🌶️🔥|This chutney is very ___.
sour|tasting like lemon|ಹುಳಿ|🍋😖|Raw mangoes taste ___.
bitter|tasting sharp, like bitter gourd|ಕಹಿ|🥒😝|Bitter gourd juice is very ___.
crispy|hard and crunchy|ಗರಿಗರಿಯಾದ|🥨✨|The dosa is hot and ___.
hungry|wanting to eat|ಹಸಿದ|🍽️😋|I am ___, so let's eat lunch.
recipe|the steps to cook a dish|ಪಾಕವಿಧಾನ|📜🍲|Grandma shared her secret ___ for bisi bele bath.
boil|to heat water until it bubbles|ಕುದಿಸು|🫕♨️|First, ___ the water for the rice.
feast|a big, special meal|ಔತಣ|🍛🎉|We ate a ___ on banana leaves at the wedding.`],
["Animals",`nest|a home that a bird builds|ಗೂಡು|🪺🐦|The sparrow built a ___ in the tree.
herd|a big group of animals|ಹಿಂಡು|🐘🐘🐘|A ___ of elephants crossed the road.
prey|an animal that is hunted by another|ಬೇಟೆ|🦌🐅|The deer is ___ for the tiger.
tame|gentle and not wild|ಪಳಗಿದ|🐕🤝|The ___ parrot sat on my hand.
fierce|wild and dangerous|ಉಗ್ರವಾದ|🐅💢|The ___ tiger roared loudly.
hatch|to come out of an egg|ಮೊಟ್ಟೆಯೊಡೆದು ಹೊರಬರು|🐣🥚|The chicks will ___ in a few days.
burrow|a hole an animal digs to live in|ಬಿಲ|🐇🕳️|The rabbit hid in its ___.
graze|to eat grass in a field|ಮೇಯು|🐄🌾|Cows ___ in the green field.`],
["School",`library|a room full of books to borrow|ಗ್ರಂಥಾಲಯ|📚🏛️|I borrow a story book from the ___.
homework|school work you do at home|ಮನೆಪಾಠ|📝🏠|Finish your ___ before you play.
absent|not there; away|ಗೈರುಹಾಜರಾದ|🪑❌|Ravi was ___ because he was sick.
punctual|always on time|ಸಮಯಪಾಲಕ|⏰✅|A ___ student is never late.
explain|to make something clear|ವಿವರಿಸು|👩‍🏫💡|Can you ___ this sum to me?
practise|to do again and again to get better|ಅಭ್ಯಾಸ ಮಾಡು|🎹🔁|I ___ the keyboard every evening.
neat|clean and tidy|ಅಚ್ಚುಕಟ್ಟಾದ|📒✨|Keep your notebook ___.
question|something you ask|ಪ್ರಶ್ನೆ|❓🙋|Raise your hand to ask a ___.`],
["Travel",`journey|a long trip|ಪ್ರಯಾಣ|🚆🗺️|The train ___ to Hampi took all night.
luggage|the bags you take on a trip|ಪ್ರಯಾಣದ ಸಾಮಾನು|🧳🧳|Our ___ was too heavy to carry.
ticket|a paper that lets you travel|ಟಿಕೆಟ್|🎫🚌|Show your ___ to the conductor.
platform|where you wait for a train|ಪ್ಲಾಟ್‌ಫಾರ್ಮ್|🚉🧍|Our train leaves from ___ two.
destination|the place you are going to|ಗಮ್ಯಸ್ಥಾನ|📍🏁|Mysuru is our ___ today.
delay|a wait that makes you late|ವಿಳಂಬ|⏳🚌|The heavy rain caused a long ___.
passenger|a person travelling in a vehicle|ಪ್ರಯಾಣಿಕ|🧑‍🤝‍🧑🚌|Every ___ must wear a seat belt.
route|the way from one place to another|ಮಾರ್ಗ|🛣️➡️|This ___ goes through the forest.`],
["Home & Family",`sweep|to clean the floor with a broom|ಗುಡಿಸು|🧹🏠|Please ___ the floor before the guests come.
chores|small jobs at home|ಮನೆಗೆಲಸಗಳು|🧺🍽️|I help Amma with the ___ every Sunday.
neighbour|a person who lives next door|ನೆರೆಯವರು|🏡👋|Our ___ gave us mangoes from her tree.
borrow|to take something and give it back later|ಎರವಲು ಪಡೆ|📕🤲|Can I ___ your pencil?
share|to give part of something to others|ಹಂಚಿಕೊ|🍪👫|Let's ___ the biscuits equally.
cosy|warm and comfortable|ಬೆಚ್ಚನೆಯ|🛋️☕|The blanket is soft and ___.
cousin|the child of your aunt or uncle|ಸೋದರಸಂಬಂಧಿ|👧👦|My ___ lives in Hubballi.
guest|a visitor to your home|ಅತಿಥಿ|🚪🙏|We always give a ___ something sweet.`],
["Action Words",`whisper|to speak very softly|ಪಿಸುಗುಟ್ಟು|🤫👂|Please ___ in the library.
shout|to speak very loudly|ಕೂಗು|📣😮|Don't ___, I can hear you.
stumble|to trip and almost fall|ಎಡವು|🦶🪨|Be careful not to ___ on the stones.
gather|to bring things together|ಒಟ್ಟುಗೂಡಿಸು|🧺🍂|Let's ___ the dry leaves into a pile.
chase|to run after|ಬೆನ್ನಟ್ಟು|🐕🏃|Dogs love to ___ cats.
climb|to go up|ಹತ್ತು|🧗⛰️|We will ___ the hill to see the sunrise.
search|to look carefully for something|ಹುಡುಕು|🔦🔍|Help me ___ for my lost key.
rescue|to save from danger|ರಕ್ಷಿಸು|🚒🐱|The firemen came to ___ the kitten.`],
["Describing Things",`tiny|very small|ತುಂಬಾ ಚಿಕ್ಕ|🐜🔍|An ant is a ___ insect.
noisy|full of loud sounds|ಗದ್ದಲದ|📢🚗|The market is busy and ___.
silent|with no sound at all|ಮೌನವಾದ|🤐🌙|The forest was ___ at night.
smooth|flat and even, not rough|ನಯವಾದ|🧈✋|The river stone was round and ___.
rough|bumpy, not smooth|ಒರಟಾದ|🪵✋|The bark of the tree feels ___.
shiny|giving back bright light|ಹೊಳೆಯುವ|✨🪙|She found a ___ coin on the road.
empty|with nothing inside|ಖಾಲಿ|📦💨|The bottle is ___. Please fill it.
heavy|hard to lift|ಭಾರವಾದ|🏋️📦|This box of books is very ___.`],
["Body & Health",`healthy|well and strong|ಆರೋಗ್ಯಕರ|🥗💪|Eat fruit to stay ___.
injury|a hurt part of the body|ಗಾಯ|🩹🦵|He got a small ___ playing football.
fever|when your body is too hot because you are ill|ಜ್ವರ|🤒🌡️|I stayed home because I had a ___.
medicine|something that helps you get well|ಔಷಧಿ|💊🩺|Take this ___ after food.
exercise|moving your body to stay fit|ವ್ಯಾಯಾಮ|🏃‍♀️🤸|We ___ every morning in the school ground.
sneeze|a sudden burst of air from your nose|ಸೀನು|🤧💨|Pepper made me ___.
swallow|to make food go down your throat|ನುಂಗು|😮🍇|Chew your food before you ___ it.
recover|to get well again|ಚೇತರಿಸಿಕೊಳ್ಳು|🛌💪|Rest well and you will ___ soon.`],
["Jobs",`farmer|a person who grows crops|ರೈತ|🧑‍🌾🌾|The ___ grows rice and ragi.
carpenter|a person who makes things from wood|ಬಡಗಿ|🪚🪑|The ___ made a new table.
potter|a person who makes pots from clay|ಕುಂಬಾರ|🏺👐|The ___ shaped the clay on his wheel.
tailor|a person who sews clothes|ದರ್ಜಿ|🧵👕|The ___ stitched my school uniform.
author|a person who writes books|ಲೇಖಕ|✍️📖|Kuvempu was a famous Kannada ___.
pilot|a person who flies a plane|ವಿಮಾನ ಚಾಲಕ|✈️👩‍✈️|The ___ landed the plane safely.
soldier|a person who serves in the army|ಸೈನಿಕ|🪖🛡️|The ___ guards our border.
engineer|a person who designs machines and buildings|ಎಂಜಿನಿಯರ್|👷‍♀️⚙️|An ___ planned the new bridge.`],
["Time",`early|before the usual time|ಬೇಗ|🌅⏰|I wake up ___ to study.
late|after the usual time|ತಡವಾಗಿ|🏃⏰|Hurry, or we will be ___ for school.
dawn|the start of the day|ಮುಂಜಾನೆ|🌄🐓|The rooster crows at ___.
midnight|twelve o'clock at night|ಮಧ್ಯರಾತ್ರಿ|🕛🌙|Everyone was asleep at ___.
often|many times|ಆಗಾಗ್ಗೆ|🔁📅|We ___ go to the park on Sundays.
seldom|not often|ವಿರಳವಾಗಿ|🐢📅|It ___ snows in Karnataka.
fortnight|two weeks|ಎರಡು ವಾರ|📅📅|The holiday lasts a ___.
century|one hundred years|ಶತಮಾನ|💯📜|This fort is more than a ___ old.`],
["Land & Water",`island|land with water all around it|ದ್ವೀಪ|🏝️🌊|Srirangapatna is an ___ in the Kaveri.
valley|low land between hills|ಕಣಿವೆ|🏞️⛰️|A river flows through the ___.
coast|land next to the sea|ಕರಾವಳಿ|🏖️🌊|Udupi is on the ___ of Karnataka.
desert|a dry, sandy land with little rain|ಮರುಭೂಮಿ|🏜️🐪|Camels can walk far in the ___.
cave|a big hole in the side of a hill|ಗುಹೆ|🕳️🦇|Bats sleep inside the dark ___.
harvest|the time when crops are collected|ಸುಗ್ಗಿ|🌾🧺|Farmers are happy at ___ time.
soil|the earth plants grow in|ಮಣ್ಣು|🪴🟫|Red ___ is good for growing ragi.
volcano|a mountain that can throw out fire and hot rock|ಜ್ವಾಲಾಮುಖಿ|🌋🔥|Hot lava poured out of the ___.`],
["People",`honest|always telling the truth|ಪ್ರಾಮಾಣಿಕ|🙋✅|The ___ boy returned the lost wallet.
clever|quick to learn and understand|ಬುದ್ಧಿವಂತ|🧠✨|The ___ crow dropped stones into the pot.
lazy|not wanting to work|ಸೋಮಾರಿ|🛋️😴|The ___ cat slept all day.
polite|speaking and acting kindly|ವಿನಯಶೀಲ|🙏😊|It is ___ to say please and thank you.
rude|not polite|ಅಸಭ್ಯ|😤👎|It is ___ to push in a queue.
kind|caring and helpful|ದಯಾಳು|🤗💛|A ___ girl helped the old man cross the road.
shy|a little scared to talk to new people|ನಾಚಿಕೆ ಸ್ವಭಾವದ|🙈😊|The ___ child hid behind her mother.
selfish|caring only about yourself|ಸ್ವಾರ್ಥಿ|🙅🍰|Don't be ___. Share your toys.`],
["Sports",`victory|winning a game or fight|ವಿಜಯ|🏆🎉|The team danced after their ___.
defeat|losing a game|ಸೋಲು|😞🏳️|We learnt a lot from our ___.
team|a group playing together|ತಂಡ|👫⚽|Our ___ has eleven players.
score|the points in a game|ಅಂಕ|🔢🏏|The final ___ was two to one.
umpire|the person who judges a cricket match|ಅಂಪೈರ್|🧑‍⚖️🏏|The ___ raised his finger. Out!
stadium|a big ground with seats all around|ಕ್ರೀಡಾಂಗಣ|🏟️🎟️|The ___ was full of cheering fans.
cheer|to shout to encourage someone|ಹುರಿದುಂಬಿಸು|📣🙌|Let's ___ for our school team.
tournament|a set of matches to find the winner|ಪಂದ್ಯಾವಳಿ|🏏🏆|Our class won the cricket ___.`],
["Space & Science",`planet|a big round world that goes around a star|ಗ್ರಹ|🪐✨|Earth is the ___ we live on.
orbit|to travel around something in space|ಕಕ್ಷೆ|🌍🛰️|The Moon is in ___ around the Earth.
gravity|the force that pulls things down|ಗುರುತ್ವಾಕರ್ಷಣೆ|🍎⬇️|___ makes the apple fall to the ground.
telescope|a tool to see things far away|ದೂರದರ್ಶಕ|🔭🌙|We saw Saturn's rings through a ___.
rocket|a machine that flies into space|ರಾಕೆಟ್|🚀🌌|The ___ blasted off into the sky.
experiment|a test to find out something|ಪ್ರಯೋಗ|🧪🔬|We did an ___ with salt and water.
magnet|a metal that pulls iron towards it|ಆಯಸ್ಕಾಂತ|🧲📎|The ___ picked up all the pins.
shadow|a dark shape made when light is blocked|ನೆರಳು|👤☀️|My ___ is long in the evening.`],
["Music & Art",`melody|a tune you can sing|ರಾಗ|🎵🎶|She hummed a sweet ___.
rhythm|a steady beat in music|ಲಯ|🥁🎵|Clap your hands to the ___.
paint|to put colour on something with a brush|ಬಣ್ಣ ಹಚ್ಚು|🎨🖌️|Let's ___ the wall bright yellow.
sketch|a quick drawing|ರೇಖಾಚಿತ್ರ|✏️📝|He made a ___ of the temple.
sculpture|a shape carved from stone or wood|ಶಿಲ್ಪ|🗿🔨|The temple has a beautiful ___ of a dancer.
audience|the people watching a show|ಪ್ರೇಕ್ಷಕರು|👏👀|The ___ clapped loudly.
perform|to act, sing or dance for people|ಪ್ರದರ್ಶಿಸು|💃🎤|Our class will ___ a play on Friday.
costume|special clothes for a show|ವೇಷಭೂಷಣ|🎭👑|The Yakshagana dancer wore a bright ___.`],
["More Actions",`observe|to watch carefully|ಗಮನಿಸು|👀🐦|___ how the ants carry food.
decide|to make up your mind|ನಿರ್ಧರಿಸು|🤔✅|Did you ___ which game to play?
arrange|to put things in order|ಜೋಡಿಸು|📚↕️|Please ___ the books on the shelf.
protect|to keep safe from harm|ಕಾಪಾಡು|🛡️👶|A mother bird will ___ her eggs.
repair|to fix something that is broken|ದುರಸ್ತಿ ಮಾಡು|🔧🚲|Dad will ___ my bicycle.
imagine|to make a picture in your mind|ಕಲ್ಪಿಸಿಕೊ|💭🦄|___ that you can fly.
invite|to ask someone to come|ಆಹ್ವಾನಿಸು|💌🎉|I will ___ my friends to my party.
complain|to say you are not happy about something|ದೂರು ನೀಡು|😤📢|He likes to ___ about the food.`],
["Describing Words",`ordinary|normal, not special|ಸಾಮಾನ್ಯ|🙂📄|It was just an ___ day.
precious|very valuable|ಅಮೂಲ್ಯ|💎✨|Time is ___. Don't waste it.
famous|known by many people|ಪ್ರಸಿದ್ಧ|🌟📸|Mysuru Palace is ___ all over the world.
dangerous|could hurt you|ಅಪಾಯಕಾರಿ|⚠️🔥|It is ___ to play near the road.
comfortable|feeling easy and relaxed|ಆರಾಮದಾಯಕ|🛏️😌|This chair is very ___.
difficult|hard to do|ಕಷ್ಟಕರ|🧗😓|The last question was ___.
simple|easy to do or understand|ಸರಳ|✅🙂|The rules of the game are ___.
strange|unusual and surprising|ವಿಚಿತ್ರ|👽❓|We heard a ___ noise at night.`],
["More Feelings",`confused|not able to understand|ಗೊಂದಲಕ್ಕೊಳಗಾದ|😕❓|I was ___ by the long question.
bored|tired of having nothing to do|ಬೇಸರಗೊಂಡ|🥱⏳|I feel ___ when it rains all day.
excited|very happy and eager|ಉತ್ಸುಕ|🤩🎢|The children were ___ about the trip.
worried|thinking something bad may happen|ಚಿಂತಿತ|😟💭|Mum was ___ when I came home late.
relieved|happy that a worry is over|ನಿರಾಳ|😮‍💨🙂|I was ___ to find my lost dog.
disappointed|sad because something was not as good as hoped|ನಿರಾಶೆಗೊಂಡ|😞🎈|He was ___ when the match was cancelled.
amazed|very surprised and impressed|ಬೆರಗಾದ|😮✨|We were ___ by the magic show.
frightened|scared|ಹೆದರಿದ|😱👻|The kitten was ___ of the thunder.`],
["Market & Money",`price|how much something costs|ಬೆಲೆ|🏷️💰|What is the ___ of these mangoes?
cheap|not costing much|ಅಗ್ಗ|🪙👍|Vegetables are ___ in the evening market.
expensive|costing a lot|ದುಬಾರಿ|💰😮|That toy car is too ___.
bargain|to talk to get a lower price|ಚೌಕಾಸಿ ಮಾಡು|🗣️🏷️|Grandma likes to ___ with the shopkeeper.
customer|a person who buys things|ಗ್ರಾಹಕ|🛒🙂|Every ___ got a free sweet.
save|to keep money to use later|ಉಳಿಸು|🐷🪙|I ___ one coin every day.
spend|to use money to buy things|ಖರ್ಚು ಮಾಡು|💸🛍️|Don't ___ all your money on sweets.
change|money given back when you pay too much|ಚಿಲ್ಲರೆ|🪙🔁|The shopkeeper gave me ten rupees ___.`],
["City Life",`traffic|cars and buses moving on the road|ಸಂಚಾರ ದಟ್ಟಣೆ|🚗🚌|There is a lot of ___ at Silk Board.
pollution|dirty air, water or land|ಮಾಲಿನ್ಯ|🏭💨|Smoke from factories causes ___.
signal|a light that tells traffic when to stop|ಸಿಗ್ನಲ್|🚦🛑|Wait for the green ___.
pedestrian|a person walking on the road|ಪಾದಚಾರಿ|🚶🦓|A ___ should use the zebra crossing.
building|a house, office or school|ಕಟ್ಟಡ|🏢🏗️|Our school is a tall ___.
market|a place where people buy and sell|ಮಾರುಕಟ್ಟೆ|🛍️🥭|We buy flowers at the ___.
garbage|things people throw away|ಕಸ|🗑️🍌|Put the ___ in the dustbin.
metro|a fast city train|ಮೆಟ್ರೋ|🚇⚡|We took the ___ to MG Road.`],
["Sea & Coast",`wave|a moving line of water in the sea|ಅಲೆ|🌊🏄|A big ___ splashed the children.
shore|the land at the edge of the sea|ದಡ|🏖️👣|We collected shells on the ___.
shell|the hard cover of a sea animal|ಚಿಪ್ಪು|🐚🌊|I can hear the sea in this ___.
fisherman|a person who catches fish|ಮೀನುಗಾರ|🎣🐟|The ___ sailed out at dawn.
tide|the rise and fall of the sea|ಉಬ್ಬರವಿಳಿತ|🌊🌙|At low ___ we can walk to the rocks.
lighthouse|a tower with a light to guide ships|ದೀಪಸ್ತಂಭ|🗼💡|The ___ shines all night.
anchor|a heavy hook that holds a ship in place|ಲಂಗರು|⚓🚢|The sailors dropped the ___.
sailor|a person who works on a ship|ನಾವಿಕ|⛵🧭|The ___ tied a strong knot.`],
["Festivals",`festival|a special day of celebration|ಹಬ್ಬ|🪔🎉|Deepavali is a ___ of lights.
worship|to pray to God|ಪೂಜಿಸು|🙏🛕|People ___ at the temple every morning.
procession|people moving together in a line|ಮೆರವಣಿಗೆ|🐘🎺|The Dasara ___ had many elephants.
fireworks|bright, noisy lights in the sky|ಪಟಾಕಿ|🎆🎇|The ___ lit up the night sky.
blessing|a wish for good things|ಆಶೀರ್ವಾದ|🙏✨|We took Grandpa's ___ before the exam.
tradition|something people have done for a long time|ಸಂಪ್ರದಾಯ|📿🏛️|Drawing rangoli is a ___ in our home.
gift|something you give to someone|ಉಡುಗೊರೆ|🎁💝|I made a ___ for my sister.
sweets|sugary food|ಸಿಹಿತಿಂಡಿ|🍬🍮|We share ___ with our neighbours.`],
["Farm & Village",`plough|to dig the soil before planting|ಉಳು|🐂🌱|The farmer will ___ the field with his bulls.
seed|a small thing that grows into a plant|ಬೀಜ|🌱🫘|Plant the ___ and water it every day.
crop|plants grown on a farm|ಬೆಳೆ|🌾🌽|Sugarcane is the main ___ in Mandya.
well|a deep hole to get water|ಬಾವಿ|🪣💧|The village gets water from the ___.
cart|a vehicle pulled by an animal|ಗಾಡಿ|🐂🛞|The bullock ___ moved slowly.
scarecrow|a figure that scares birds from crops|ಬೆದರುಬೊಂಬೆ|🧑‍🌾🐦|The ___ kept the crows away.
fence|a wall made of wood or wire|ಬೇಲಿ|🪵🚧|The goat jumped over the ___.
pond|a small lake|ಕೊಳ|🦆💧|Ducks swim in the village ___.`],
["Character",`humble|not proud or showing off|ವಿನಮ್ರ|🙇🌾|The champion was ___ and kind.
arrogant|thinking you are better than others|ಅಹಂಕಾರಿ|😤👑|The ___ hare laughed at the tortoise.
careless|not paying attention|ಅಜಾಗರೂಕ|🫗😬|He was ___ and spilled the milk.
careful|paying attention to avoid mistakes|ಜಾಗರೂಕ|🧐✅|Be ___ with the scissors.
gentle|soft and kind|ಸೌಮ್ಯ|🤲🐣|Be ___ with the baby bird.
stubborn|not willing to change your mind|ಹಠಮಾರಿ|🐐🙅|The ___ goat would not move.
loyal|always supporting your friends|ನಿಷ್ಠಾವಂತ|🐕❤️|A dog is a ___ friend.
wise|knowing a lot and making good choices|ವಿವೇಕಿ|🦉📚|The ___ old man gave good advice.`],
["Big Verbs",`discover|to find something for the first time|ಕಂಡುಹಿಡಿ|🔎🗝️|Scientists ___ new things every day.
encourage|to give someone hope and courage|ಪ್ರೋತ್ಸಾಹಿಸು|🙌💪|Teachers ___ us to try again.
forgive|to stop being angry with someone|ಕ್ಷಮಿಸು|🤝💛|Please ___ me. I am sorry.
improve|to get better|ಸುಧಾರಿಸು|📈🙂|Reading every day will ___ your English.
obey|to do what you are told|ಪಾಲಿಸು|🚦👍|We must ___ the traffic rules.
predict|to say what will happen|ಊಹಿಸು|🔮❓|Can you ___ the end of the story?
prepare|to get ready|ತಯಾರಾಗು|🎒📝|Let's ___ for the test.
succeed|to do what you tried to do|ಯಶಸ್ವಿಯಾಗು|🏁🏆|If you work hard, you will ___.`],
["Our Planet",`recycle|to use old things to make new ones|ಮರುಬಳಕೆ ಮಾಡು|♻️📦|We ___ paper and plastic bottles.
waste|to use more than you need|ವ್ಯರ್ಥ ಮಾಡು|🚰💧|Don't ___ water.
plant|to put a seed or tree in the ground|ನೆಡು|🌱🌳|Let's ___ a tree on Environment Day.
pollute|to make air, water or land dirty|ಕಲುಷಿತಗೊಳಿಸು|🏭🌫️|Plastic bags ___ our lakes.
endangered|at risk of disappearing forever|ಅಳಿವಿನಂಚಿನಲ್ಲಿರುವ|🐅⚠️|The tiger is an ___ animal.
nature|trees, animals, rivers and sky|ಪ್ರಕೃತಿ|🌳🦋|We must take care of ___.
energy|the power to make things work|ಶಕ್ತಿ|⚡🔋|The sun gives us ___.
litter|to throw rubbish on the ground|ಕಸ ಹಾಕು|🚯🍬|Please do not ___ in the park.`],
["Story Time",`hero|a brave person people admire|ನಾಯಕ|🦸✨|The ___ saved the village.
villain|the bad person in a story|ಖಳನಾಯಕ|🦹😈|The ___ stole the king's crown.
adventure|an exciting journey|ಸಾಹಸ|🗺️🧭|Our trip to the forest was an ___.
treasure|gold, jewels and precious things|ನಿಧಿ|💰👑|The pirates buried their ___.
secret|something you keep hidden|ರಹಸ್ಯ|🤫🔒|Can you keep a ___?
magic|tricks that seem impossible|ಜಾದೂ|🪄🎩|The magician did some ___ with a hat.
kingdom|a land ruled by a king or queen|ರಾಜ್ಯ|👑🏰|Vijayanagara was a rich ___.
legend|an old story from long ago|ದಂತಕಥೆ|📜🐉|The ___ says a giant lived in these hills.`],
["Talking",`message|words you send to someone|ಸಂದೇಶ|💬📱|I sent a ___ to my friend.
reply|to answer|ಉತ್ತರಿಸು|↩️💬|Please ___ to my letter.
announce|to tell everyone something|ಘೋಷಿಸು|📢🎤|The principal will ___ the winners.
describe|to say what something is like|ವರ್ಣಿಸು|🗣️🖼️|Can you ___ your best friend?
argue|to talk angrily because you disagree|ವಾದಿಸು|🗣️⚡|My brothers ___ about the TV.
agree|to think the same as someone|ಒಪ್ಪು|🤝👍|I ___ with you.
promise|to say you will surely do something|ಮಾತು ಕೊಡು|🤙💛|I ___ to finish my homework.
apologise|to say sorry|ಕ್ಷಮೆ ಕೇಳು|🙏😔|You should ___ for being rude.`]
];
const FIRST_TOPICS=["City Words","Celebration Words","Nature Words","History Words","Adventure Words"];
const PACKS=WORLDS.map((w,i)=>({topic:FIRST_TOPICS[i],words:w.words}))
  .concat(PACK_SRC.map(([topic,src])=>({topic,words:src.trim().split("\n").map(l=>{const [a,m,k,p,s]=l.split("|");return{a,m,k,p,s,r:null}})})));
PACKS.forEach((pk,i)=>pk.words.forEach(w=>{w.pk=i;if(!w.r)w.r=`I mean “${w.m}”. Which word am I?`}));
const ALL_PACK_WORDS=PACKS.flatMap(p=>p.words);

/* ---------- levels ---------- */
const LV_CACHE={};
function LEVEL(n){
  if(LV_CACHE[n])return LV_CACHE[n];
  const pi=n%PLACES.length,place=PLACES[pi],tour=Math.floor(n/PLACES.length)+1;
  let words,topic,review=false;
  if(n<PACKS.length){words=PACKS[n].words;topic=PACKS[n].topic}
  else{ // endless review tours: the words you know least, plus a sprinkle of everything
    review=true;topic="Review Tour";
    const r=mkRng(n*7919+13),pool=ALL_PACK_WORDS.slice();
    const weak=pool.map(w=>{const rec=PROG.words[w.a];return{w,s:(rec?5-rec.lvl:6)+r()*3}}).sort((a,b)=>b.s-a.s);
    words=weak.slice(0,8).map(x=>x.w);
  }
  return LV_CACHE[n]={...place,n,pi,tour,topic,words,review};
}
