// Everyday conversations: three townspeople near every landmark need help finding their words.
// Each scene: the friend speaks (English + Kannada help), you see what you want to say in Kannada,
// pick the correct English reply, then SAY it out loud. Every scene also teaches three new words.
//
// line: ["n", english, kannada]                       -> the townsperson speaks
//       ["y", kannada (what you want to say), right, wrong, wrong]   -> your reply ({me} = your hero's name)
const W = (w, m, k, p, s) => ({ w, m, k, p, s });
const T = (id, model, icon, name, title, kn, lines, words) => ({ id, model, icon, name, title, kn, lines, words });

export const TALKS = {
  bengaluru: [
    T("hello", "npc_parrot", "🦜", "Putta", "Meeting someone new", "ಹೊಸಬರನ್ನು ಭೇಟಿಯಾಗುವುದು", [
      ["n", "Hello! I have not seen you here before. What is your name?", "ನಮಸ್ಕಾರ! ನಿಮ್ಮನ್ನು ಇಲ್ಲಿ ಮೊದಲು ನೋಡಿಲ್ಲ. ನಿಮ್ಮ ಹೆಸರೇನು?"],
      ["y", "ನನ್ನ ಹೆಸರು {me}. ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿ ಸಂತೋಷವಾಯಿತು.", "My name is {me}. Nice to meet you.", "My name {me}. Nice meeting.", "I name is {me}. Nice to meeting you."],
      ["n", "Nice to meet you too! Where are you from?", "ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿ ನನಗೂ ಸಂತೋಷ! ನೀವು ಎಲ್ಲಿಯವರು?"],
      ["y", "ನಾನು ಕರ್ನಾಟಕದಿಂದ ಬಂದಿದ್ದೇನೆ.", "I am from Karnataka.", "I from Karnataka.", "I am come Karnataka."],
      ["n", "Wonderful! And what do you do?", "ಅದ್ಭುತ! ನೀವು ಏನು ಮಾಡುತ್ತೀರಿ?"],
      ["y", "ನಾನು ಇಂಗ್ಲಿಷ್ ಕಲಿಯುತ್ತಿದ್ದೇನೆ.", "I am learning English.", "I am learn English.", "I learning the English."],
    ], [
      W("introduce", "to tell someone your name when you first meet", "ಪರಿಚಯಿಸು", "👋", "Let me ___ myself. I am new here."),
      W("stranger", "a person you do not know", "ಅಪರಿಚಿತ", "🧑", "Yesterday he was a ___. Today he is a friend."),
      W("pleasure", "a happy, good feeling", "ಸಂತೋಷ", "😊", "It is a ___ to meet you."),
    ]),
    T("auto", "npc_monkey", "🐒", "Ravi the auto driver", "Taking an auto", "ಆಟೋ ಹಿಡಿಯುವುದು", [
      ["n", "Auto! Where do you want to go?", "ಆಟೋ! ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?"],
      ["y", "ನಾನು ರೈಲು ನಿಲ್ದಾಣಕ್ಕೆ ಹೋಗಬೇಕು.", "I want to go to the railway station.", "I want go railway station.", "I am wanting to going station."],
      ["n", "That will be one hundred rupees.", "ಅದಕ್ಕೆ ನೂರು ರೂಪಾಯಿ ಆಗುತ್ತದೆ."],
      ["y", "ಅದು ತುಂಬಾ ಜಾಸ್ತಿ. ದಯವಿಟ್ಟು ಮೀಟರ್ ಹಾಕಿ.", "That is too much. Please use the meter.", "That is too many. Please do meter.", "It too much. Please using meter."],
      ["n", "Okay, okay. Sit down. Do you have change?", "ಸರಿ, ಸರಿ. ಕುಳಿತುಕೊಳ್ಳಿ. ನಿಮ್ಮ ಬಳಿ ಚಿಲ್ಲರೆ ಇದೆಯೇ?"],
      ["y", "ಹೌದು, ನನ್ನ ಬಳಿ ಚಿಲ್ಲರೆ ಇದೆ.", "Yes, I have change.", "Yes, I am have change.", "Yes, I having change."],
    ], [
      W("fare", "the money you pay for a ride", "ಪ್ರಯಾಣ ದರ", "💵", "The auto ___ to the station is fifty rupees."),
      W("change", "small coins and notes", "ಚಿಲ್ಲರೆ", "🪙", "Sorry, I do not have ___ for five hundred."),
      W("station", "a place where trains or buses stop", "ನಿಲ್ದಾಣ", "🚉", "The train leaves the ___ at six."),
    ]),
    T("darshini", "npc_elephant", "🐘", "Shanti the cook", "Ordering breakfast", "ತಿಂಡಿ ಆರ್ಡರ್ ಮಾಡುವುದು", [
      ["n", "Good morning! What would you like to eat?", "ಶುಭೋದಯ! ನೀವು ಏನು ತಿನ್ನಲು ಬಯಸುತ್ತೀರಿ?"],
      ["y", "ನನಗೆ ಒಂದು ಮಸಾಲೆ ದೋಸೆ ಬೇಕು.", "I would like one masala dosa, please.", "I would liking one masala dosa.", "I like one masala dosa want."],
      ["n", "Anything to drink?", "ಕುಡಿಯಲು ಏನಾದರೂ ಬೇಕೇ?"],
      ["y", "ಒಂದು ಕಾಫಿ, ಸಕ್ಕರೆ ಕಡಿಮೆ ಇರಲಿ.", "One coffee with less sugar, please.", "One coffee with few sugar, please.", "One coffee less of sugar is."],
      ["n", "Here you are. Is it tasty?", "ತಗೊಳ್ಳಿ. ರುಚಿಯಾಗಿದೆಯೇ?"],
      ["y", "ಹೌದು, ತುಂಬಾ ರುಚಿಯಾಗಿದೆ. ಧನ್ಯವಾದ!", "Yes, it is delicious. Thank you!", "Yes, it delicious. Thanks you!", "Yes, it is much taste. Thank!"],
    ], [
      W("order", "to ask for food or things you want to buy", "ಆರ್ಡರ್ ಮಾಡು", "📝", "Let us ___ two plates of idli."),
      W("delicious", "very tasty", "ರುಚಿಕರ", "😋", "This dosa is hot and ___."),
      W("hungry", "wanting to eat", "ಹಸಿದ", "🍽️", "I did not eat breakfast, so I am very ___."),
    ]),
  ],
  mysuru: [
    T("market", "npc_bull", "🐂", "Thimma the fruit seller", "Buying at the market", "ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಕೊಳ್ಳುವುದು", [
      ["n", "Fresh flowers! Fresh fruits! What do you need?", "ತಾಜಾ ಹೂವು! ತಾಜಾ ಹಣ್ಣು! ನಿಮಗೆ ಏನು ಬೇಕು?"],
      ["y", "ಈ ಮಾವಿನ ಹಣ್ಣುಗಳ ಬೆಲೆ ಎಷ್ಟು?", "How much are these mangoes?", "How many is these mangoes?", "What much these mangoes?"],
      ["n", "Two hundred rupees for one kilo.", "ಒಂದು ಕಿಲೋಗೆ ಇನ್ನೂರು ರೂಪಾಯಿ."],
      ["y", "ಬೆಲೆ ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಬಹುದೇ?", "Can you reduce the price a little?", "Can you reducing price little?", "You can little the price?"],
      ["n", "Fine. One hundred and eighty, just for you.", "ಸರಿ. ನಿಮಗಾಗಿ ಮಾತ್ರ ನೂರ ಎಂಬತ್ತು."],
      ["y", "ಸರಿ, ನಾನು ಒಂದು ಕಿಲೋ ತಗೊಳ್ಳುತ್ತೇನೆ.", "Okay, I will take one kilo.", "Okay, I will took one kilo.", "Okay, I taking one kilo."],
    ], [
      W("price", "how much money something costs", "ಬೆಲೆ", "🏷️", "The ___ of mangoes goes down in summer."),
      W("fresh", "newly picked or made, not old", "ತಾಜಾ", "🥭", "These flowers are ___. They were picked this morning."),
      W("bargain", "to talk about the price to make it lower", "ಚೌಕಾಸಿ ಮಾಡು", "🤝", "My mother loves to ___ at the market."),
    ]),
    T("directions", "npc_elephant", "🐘", "Kempa the guard", "Asking the way", "ದಾರಿ ಕೇಳುವುದು", [
      ["n", "You look lost. Can I help you?", "ನೀವು ದಾರಿ ತಪ್ಪಿದಂತೆ ಕಾಣುತ್ತೀರಿ. ನಾನು ಸಹಾಯ ಮಾಡಲೇ?"],
      ["y", "ಕ್ಷಮಿಸಿ, ಅರಮನೆಗೆ ಹೇಗೆ ಹೋಗುವುದು?", "Excuse me, how do I get to the palace?", "Excuse me, how I go palace?", "Excuse, how to getting the palace?"],
      ["n", "Go straight and turn left at the signal.", "ನೇರವಾಗಿ ಹೋಗಿ, ಸಿಗ್ನಲ್‌ನಲ್ಲಿ ಎಡಕ್ಕೆ ತಿರುಗಿ."],
      ["y", "ಅದು ಇಲ್ಲಿಂದ ದೂರವೇ?", "Is it far from here?", "Is it far to here?", "Does it far from here?"],
      ["n", "No, it is only five minutes on foot.", "ಇಲ್ಲ, ನಡೆದು ಹೋದರೆ ಐದು ನಿಮಿಷ ಮಾತ್ರ."],
      ["y", "ತುಂಬಾ ಧನ್ಯವಾದಗಳು. ನೀವು ತುಂಬಾ ಸಹಾಯ ಮಾಡಿದಿರಿ.", "Thank you so much. You are very helpful.", "Thank you so many. You very helpful.", "Thanks you much. You are very help."],
    ], [
      W("straight", "in one line, without turning", "ನೇರ", "⬆️", "Go ___ on this road until you see the temple."),
      W("turn", "to change direction", "ತಿರುಗು", "↩️", "___ right after the big tree."),
      W("nearby", "not far away", "ಹತ್ತಿರದಲ್ಲಿ", "📍", "Is there a medical shop ___?"),
    ]),
    T("family", "npc_parrot", "🦜", "Ajji", "Talking about family", "ಕುಟುಂಬದ ಬಗ್ಗೆ ಮಾತು", [
      ["n", "Come, sit. Tell me, who is in your family?", "ಬಾ, ಕೂತುಕೋ. ಹೇಳು, ನಿನ್ನ ಕುಟುಂಬದಲ್ಲಿ ಯಾರಿದ್ದಾರೆ?"],
      ["y", "ನನ್ನ ಕುಟುಂಬದಲ್ಲಿ ನಾಲ್ಕು ಜನ ಇದ್ದಾರೆ.", "There are four people in my family.", "There is four peoples in my family.", "My family have four people in."],
      ["n", "Do you have any brothers or sisters?", "ನಿನಗೆ ಅಣ್ಣ-ತಮ್ಮ ಅಥವಾ ಅಕ್ಕ-ತಂಗಿ ಇದ್ದಾರೆಯೇ?"],
      ["y", "ನನಗೆ ಒಬ್ಬ ತಮ್ಮ ಇದ್ದಾನೆ.", "I have one younger brother.", "I has one younger brother.", "I am having one small brother."],
      ["n", "How lovely! Do you miss them?", "ಎಷ್ಟು ಚೆನ್ನ! ಅವರ ನೆನಪಾಗುತ್ತದೆಯೇ?"],
      ["y", "ಹೌದು, ನನಗೆ ಅವರ ನೆನಪು ತುಂಬಾ ಆಗುತ್ತದೆ.", "Yes, I miss them a lot.", "Yes, I missing them lot.", "Yes, I miss they a lot."],
    ], [
      W("relative", "a person in your family", "ಸಂಬಂಧಿ", "👨‍👩‍👧", "My ___ from Hassan is visiting us."),
      W("elder", "older than you", "ಹಿರಿಯ", "🧓", "My ___ sister works in Bengaluru."),
      W("miss", "to feel sad because someone is not with you", "ನೆನಪಾಗು", "💭", "I ___ my grandmother's cooking."),
    ]),
  ],
  kodagu: [
    T("weather", "npc_monkey", "🐒", "Bopanna", "Talking about the weather", "ಹವಾಮಾನದ ಬಗ್ಗೆ ಮಾತು", [
      ["n", "Brr! It is so cold today, isn't it?", "ಬ್ರ್ರ್! ಇವತ್ತು ತುಂಬಾ ಚಳಿ, ಅಲ್ಲವೇ?"],
      ["y", "ಹೌದು, ಇವತ್ತು ತುಂಬಾ ಚಳಿ ಇದೆ.", "Yes, it is very cold today.", "Yes, it very cold today.", "Yes, today is much cold."],
      ["n", "Do you think it will rain?", "ಮಳೆ ಬರುತ್ತದೆ ಎಂದು ನಿಮಗೆ ಅನಿಸುತ್ತದೆಯೇ?"],
      ["y", "ಮಳೆ ಬರಬಹುದು ಎಂದು ನನಗೆ ಅನಿಸುತ್ತದೆ.", "I think it might rain.", "I think it might rains.", "I am think it rain."],
      ["n", "Then take an umbrella!", "ಹಾಗಾದರೆ ಛತ್ರಿ ತಗೊಂಡು ಹೋಗಿ!"],
      ["y", "ಒಳ್ಳೆಯ ಯೋಚನೆ. ನಾನು ಛತ್ರಿ ತರುತ್ತೇನೆ.", "Good idea. I will bring an umbrella.", "Good idea. I will bringing a umbrella.", "Good idea. I bring umbrella will."],
    ], [
      W("weather", "how hot, cold, rainy or sunny it is", "ಹವಾಮಾನ", "🌦️", "The ___ in Kodagu changes every hour."),
      W("umbrella", "something you hold over your head in the rain", "ಛತ್ರಿ", "☂️", "Take an ___. The sky is dark."),
      W("chilly", "a little cold", "ಚಳಿಯಾದ", "🧣", "Mornings in the hills are ___."),
    ]),
    T("homestay", "npc_elephant", "🐘", "Kaveri", "Checking in at a homestay", "ಹೋಂಸ್ಟೇಯಲ್ಲಿ ಉಳಿಯುವುದು", [
      ["n", "Welcome to our homestay! Do you have a booking?", "ನಮ್ಮ ಹೋಂಸ್ಟೇಗೆ ಸ್ವಾಗತ! ನೀವು ಬುಕಿಂಗ್ ಮಾಡಿದ್ದೀರಾ?"],
      ["y", "ಹೌದು, ನಾನು ಎರಡು ರಾತ್ರಿಗೆ ಕೋಣೆ ಬುಕ್ ಮಾಡಿದ್ದೇನೆ.", "Yes, I have booked a room for two nights.", "Yes, I have book a room for two night.", "Yes, I booking room since two nights."],
      ["n", "Would you like a room with a view of the hills?", "ಬೆಟ್ಟಗಳು ಕಾಣುವ ಕೋಣೆ ಬೇಕೇ?"],
      ["y", "ಹೌದು, ಅದು ತುಂಬಾ ಚೆನ್ನಾಗಿರುತ್ತದೆ.", "Yes, that would be lovely.", "Yes, that would lovely.", "Yes, that will being lovely."],
      ["n", "Breakfast is at eight o'clock.", "ಬೆಳಗಿನ ತಿಂಡಿ ಎಂಟು ಗಂಟೆಗೆ."],
      ["y", "ಸರಿ. ದಯವಿಟ್ಟು ನನ್ನನ್ನು ಏಳು ಗಂಟೆಗೆ ಎಬ್ಬಿಸಿ.", "Okay. Please wake me up at seven.", "Okay. Please wake up me on seven.", "Okay. Please waking me at seven."],
    ], [
      W("guest", "a person who visits or stays with you", "ಅತಿಥಿ", "🧳", "In Kodagu, every ___ gets hot coffee."),
      W("comfortable", "feeling nice and relaxed", "ಆರಾಮದಾಯಕ", "🛏️", "This bed is soft and ___."),
      W("view", "what you can see from a place", "ನೋಟ", "🏞️", "The ___ from this window is beautiful."),
    ]),
    T("feelings", "npc_parrot", "🦜", "Muthu", "Saying how you feel", "ನಿಮಗೆ ಹೇಗನಿಸುತ್ತಿದೆ ಎಂದು ಹೇಳುವುದು", [
      ["n", "You look tired, my friend. How are you feeling?", "ನೀನು ದಣಿದಂತೆ ಕಾಣುತ್ತೀಯ, ಗೆಳೆಯ. ನಿನಗೆ ಹೇಗೆ ಅನಿಸುತ್ತಿದೆ?"],
      ["y", "ನನಗೆ ಸ್ವಲ್ಪ ಸುಸ್ತಾಗಿದೆ, ಆದರೆ ನಾನು ಖುಷಿಯಾಗಿದ್ದೇನೆ.", "I am a little tired, but I am happy.", "I am little tire, but happy I am.", "I feeling a little tired, but I happy."],
      ["n", "Why are you happy?", "ನೀನು ಯಾಕೆ ಖುಷಿಯಾಗಿದ್ದೀಯ?"],
      ["y", "ಏಕೆಂದರೆ ನಾನು ಪ್ರತಿದಿನ ಹೊಸ ಪದಗಳನ್ನು ಕಲಿಯುತ್ತಿದ್ದೇನೆ.", "Because I am learning new words every day.", "Because I learning new word every days.", "Because I am learn new words all day's."],
      ["n", "That is wonderful. Take some rest now.", "ಅದು ಅದ್ಭುತ. ಈಗ ಸ್ವಲ್ಪ ವಿಶ್ರಾಂತಿ ತಗೋ."],
      ["y", "ಧನ್ಯವಾದ. ನಾನು ಸ್ವಲ್ಪ ಹೊತ್ತು ವಿಶ್ರಾಂತಿ ತಗೊಳ್ಳುತ್ತೇನೆ.", "Thank you. I will rest for a while.", "Thank you. I will resting for while.", "Thank you. I rest will a while."],
    ], [
      W("tired", "needing rest or sleep", "ದಣಿದ", "😴", "After the long walk, we were all ___."),
      W("rest", "to stop working and relax", "ವಿಶ್ರಾಂತಿ", "🛋️", "Sit down and ___ for ten minutes."),
      W("excited", "very happy about something that is going to happen", "ಉತ್ಸಾಹಗೊಂಡ", "🤩", "I am ___ about the trip tomorrow."),
    ]),
  ],
  coast: [
    T("bus", "npc_monkey", "🐒", "Seena the conductor", "At the bus stand", "ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ", [
      ["n", "Mangaluru! Udupi! Where are you going?", "ಮಂಗಳೂರು! ಉಡುಪಿ! ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ?"],
      ["y", "ಉಡುಪಿಗೆ ಎರಡು ಟಿಕೆಟ್ ಕೊಡಿ.", "Two tickets to Udupi, please.", "Two ticket for Udupi give.", "Two tickets at Udupi, please."],
      ["n", "The bus leaves in ten minutes.", "ಬಸ್ ಹತ್ತು ನಿಮಿಷದಲ್ಲಿ ಹೊರಡುತ್ತದೆ."],
      ["y", "ಬಸ್ ಯಾವಾಗ ತಲುಪುತ್ತದೆ?", "When does the bus arrive?", "When the bus arrives?", "When do the bus arrive?"],
      ["n", "It arrives at six in the evening.", "ಅದು ಸಂಜೆ ಆರು ಗಂಟೆಗೆ ತಲುಪುತ್ತದೆ."],
      ["y", "ಇದು ಕಿಟಕಿ ಪಕ್ಕದ ಸೀಟೇ?", "Is this a window seat?", "Is this window seat is?", "This a window seat is?"],
    ], [
      W("arrive", "to reach a place", "ತಲುಪು", "🏁", "We will ___ in Udupi before sunset."),
      W("depart", "to leave a place and start a trip", "ಹೊರಡು", "🚌", "The first bus will ___ at five in the morning."),
      W("passenger", "a person travelling in a bus, train or car", "ಪ್ರಯಾಣಿಕ", "🧍", "Every ___ must buy a ticket."),
    ]),
    T("beach", "npc_parrot", "🦜", "Meenu", "Talking about hobbies", "ಹವ್ಯಾಸಗಳ ಬಗ್ಗೆ ಮಾತು", [
      ["n", "I love the beach! What do you like to do in your free time?", "ನನಗೆ ಬೀಚ್ ತುಂಬಾ ಇಷ್ಟ! ಬಿಡುವಿನ ಸಮಯದಲ್ಲಿ ನೀವು ಏನು ಮಾಡಲು ಇಷ್ಟಪಡುತ್ತೀರಿ?"],
      ["y", "ನನಗೆ ಹಾಡು ಕೇಳುವುದು ಮತ್ತು ಅಡುಗೆ ಮಾಡುವುದು ಇಷ್ಟ.", "I like listening to music and cooking.", "I like listen music and cook.", "I am like to listening music and cooking."],
      ["n", "Nice! Can you swim?", "ಚೆನ್ನಾಗಿದೆ! ನಿಮಗೆ ಈಜಲು ಬರುತ್ತದೆಯೇ?"],
      ["y", "ಇಲ್ಲ, ನನಗೆ ಈಜಲು ಬರುವುದಿಲ್ಲ, ಆದರೆ ಕಲಿಯಬೇಕು.", "No, I cannot swim, but I want to learn.", "No, I cannot swimming, but I want learn.", "No, I can not to swim, but I wanting to learn."],
      ["n", "I can teach you on Sunday!", "ನಾನು ಭಾನುವಾರ ಕಲಿಸುತ್ತೇನೆ!"],
      ["y", "ಅದು ತುಂಬಾ ಚೆನ್ನಾಗಿರುತ್ತದೆ. ಭಾನುವಾರ ಸಿಗೋಣ!", "That sounds great. See you on Sunday!", "That sound great. See you in Sunday!", "That is sounding great. See you at Sunday!"],
    ], [
      W("hobby", "something you enjoy doing in your free time", "ಹವ್ಯಾಸ", "🎨", "Drawing rangoli is my favourite ___."),
      W("swim", "to move through water using your arms and legs", "ಈಜು", "🏊", "Fish can ___ as soon as they are born."),
      W("weekend", "Saturday and Sunday", "ವಾರಾಂತ್ಯ", "📅", "We go to the beach every ___."),
    ]),
    T("clinic", "npc_elephant", "🐘", "Doctor Gowri", "At the clinic", "ಕ್ಲಿನಿಕ್‌ನಲ್ಲಿ", [
      ["n", "Hello. What is the problem?", "ನಮಸ್ಕಾರ. ಏನು ತೊಂದರೆ?"],
      ["y", "ನನಗೆ ತಲೆನೋವು ಮತ್ತು ಜ್ವರ ಇದೆ.", "I have a headache and a fever.", "I am headache and fever.", "I having a headache and a fever."],
      ["n", "Did you sleep well last night?", "ನಿನ್ನೆ ರಾತ್ರಿ ಚೆನ್ನಾಗಿ ನಿದ್ದೆ ಮಾಡಿದಿರಾ?"],
      ["y", "ಇಲ್ಲ, ನನಗೆ ಚೆನ್ನಾಗಿ ನಿದ್ದೆ ಬರಲಿಲ್ಲ.", "No, I did not sleep well.", "No, I did not slept well.", "No, I not sleep well."],
      ["n", "Take this medicine twice a day and drink warm water.", "ಈ ಔಷಧಿಯನ್ನು ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ ತಗೊಳ್ಳಿ, ಬಿಸಿ ನೀರು ಕುಡಿಯಿರಿ."],
      ["y", "ಸರಿ ಡಾಕ್ಟರ್. ನಾನು ಮತ್ತೆ ಯಾವಾಗ ಬರಬೇಕು?", "Okay, doctor. When should I come again?", "Okay, doctor. When I should came again?", "Okay, doctor. When should I coming again?"],
    ], [
      W("headache", "a pain in your head", "ತಲೆನೋವು", "🤕", "Too much sun gives me a ___."),
      W("medicine", "something you take to feel better when you are sick", "ಔಷಧಿ", "💊", "Take this ___ after food."),
      W("fever", "when your body is too hot because you are sick", "ಜ್ವರ", "🌡️", "She stayed at home because she had a ___."),
    ]),
  ],
  jog: [
    T("lost", "npc_monkey", "🐒", "Ranga", "Asking for help", "ಸಹಾಯ ಕೇಳುವುದು", [
      ["n", "You look worried. What happened?", "ನೀವು ಚಿಂತೆಯಲ್ಲಿರುವಂತೆ ಕಾಣುತ್ತೀರಿ. ಏನಾಯಿತು?"],
      ["y", "ನನ್ನ ಫೋನ್ ಕಳೆದುಹೋಗಿದೆ. ನನಗೆ ಸಹಾಯ ಮಾಡಬಹುದೇ?", "I have lost my phone. Could you help me?", "I have lose my phone. Could you helping me?", "I lost have my phone. You could help me?"],
      ["n", "Of course. Where did you last see it?", "ಖಂಡಿತ. ಕೊನೆಯ ಬಾರಿ ಅದನ್ನು ಎಲ್ಲಿ ನೋಡಿದಿರಿ?"],
      ["y", "ನಾನು ಅದನ್ನು ಚಹಾ ಅಂಗಡಿಯ ಹತ್ತಿರ ನೋಡಿದೆ.", "I saw it near the tea shop.", "I seen it near of tea shop.", "I did saw it near the tea shop."],
      ["n", "Look! Is this your phone?", "ನೋಡಿ! ಇದು ನಿಮ್ಮ ಫೋನೇ?"],
      ["y", "ಹೌದು, ಇದು ನನ್ನದೇ! ನೀವು ನನ್ನನ್ನು ಕಾಪಾಡಿದಿರಿ.", "Yes, it is mine! You saved me.", "Yes, it is my! You save me.", "Yes, it mine is! You saving me."],
    ], [
      W("lost", "not able to be found", "ಕಳೆದುಹೋದ", "❓", "I found a ___ puppy near the bus stop."),
      W("search", "to look carefully for something", "ಹುಡುಕು", "🔦", "Let us ___ under the table."),
      W("helpful", "willing to help other people", "ಸಹಾಯಕ", "🙌", "The shopkeeper was very ___."),
    ]),
    T("phone", "npc_parrot", "🦜", "Girija", "Talking on the phone", "ಫೋನ್‌ನಲ್ಲಿ ಮಾತು", [
      ["n", "Tring tring! Hello, who is speaking?", "ಟ್ರಿಂಗ್ ಟ್ರಿಂಗ್! ಹಲೋ, ಯಾರು ಮಾತನಾಡುತ್ತಿದ್ದೀರಿ?"],
      ["y", "ಹಲೋ, ನಾನು {me} ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ.", "Hello, this is {me} speaking.", "Hello, I am {me} speak.", "Hello, here is {me} speaking me."],
      ["n", "Sorry, I cannot hear you. The waterfall is too loud!", "ಕ್ಷಮಿಸಿ, ನನಗೆ ಕೇಳಿಸುತ್ತಿಲ್ಲ. ಜಲಪಾತದ ಶಬ್ದ ತುಂಬಾ ಜೋರಾಗಿದೆ!"],
      ["y", "ನಾನು ನಿಮಗೆ ಆಮೇಲೆ ಮತ್ತೆ ಕರೆ ಮಾಡಲೇ?", "Can I call you back later?", "Can I calling you back later?", "Can I call back you latest?"],
      ["n", "Yes, please call me after five.", "ಹೌದು, ದಯವಿಟ್ಟು ಐದು ಗಂಟೆಯ ನಂತರ ಕರೆ ಮಾಡಿ."],
      ["y", "ಸರಿ, ನಾನು ಐದು ಗಂಟೆಗೆ ಕರೆ ಮಾಡುತ್ತೇನೆ. ಬೈ!", "Sure, I will call you at five. Bye!", "Sure, I will called you at five. Bye!", "Sure, I call you will on five. Bye!"],
    ], [
      W("loud", "making a lot of sound", "ಜೋರಾದ", "📢", "The music is too ___. Please turn it down."),
      W("later", "after some time, not now", "ಆಮೇಲೆ", "⏰", "I am busy now. Can we talk ___?"),
      W("message", "a short note you send to someone", "ಸಂದೇಶ", "💬", "Send me a ___ when you reach home."),
    ]),
    T("plans", "npc_elephant", "🐘", "Sundari", "Making plans", "ಯೋಜನೆ ಮಾಡುವುದು", [
      ["n", "Tomorrow is a holiday! Do you have any plans?", "ನಾಳೆ ರಜೆ! ನಿಮಗೆ ಏನಾದರೂ ಯೋಜನೆ ಇದೆಯೇ?"],
      ["y", "ಇಲ್ಲ, ನನಗೆ ಯಾವ ಯೋಜನೆಯೂ ಇಲ್ಲ.", "No, I do not have any plans.", "No, I do not has any plan.", "No, I am not have any plans."],
      ["n", "Shall we go and see the waterfall together?", "ನಾವು ಒಟ್ಟಿಗೆ ಜಲಪಾತ ನೋಡಲು ಹೋಗೋಣವೇ?"],
      ["y", "ಹೌದು, ಹೋಗೋಣ! ಎಷ್ಟು ಗಂಟೆಗೆ ಸಿಗೋಣ?", "Yes, let's go! What time shall we meet?", "Yes, let's going! What time we shall meet?", "Yes, let go! Which time shall we meeting?"],
      ["n", "Let us meet at nine in the morning.", "ಬೆಳಿಗ್ಗೆ ಒಂಬತ್ತು ಗಂಟೆಗೆ ಸಿಗೋಣ."],
      ["y", "ಸರಿ. ನಾನು ತಡ ಮಾಡುವುದಿಲ್ಲ.", "Perfect. I will not be late.", "Perfect. I will not late.", "Perfect. I will be not lately."],
    ], [
      W("holiday", "a day when you do not go to work or school", "ರಜೆ", "🏖️", "Sunday is a ___ for most people."),
      W("plan", "an idea of what you will do", "ಯೋಜನೆ", "🗓️", "What is your ___ for the evening?"),
      W("late", "after the right time", "ತಡ", "🕘", "Hurry up, or we will be ___ for the bus."),
    ]),
  ],
  hampi: [
    T("photo", "npc_parrot", "🦜", "Tara the tourist", "Asking for a photo", "ಫೋಟೋ ತೆಗೆಯಲು ಕೇಳುವುದು", [
      ["n", "Wow, what a beautiful place!", "ವಾವ್, ಎಷ್ಟು ಸುಂದರವಾದ ಜಾಗ!"],
      ["y", "ಕ್ಷಮಿಸಿ, ನನ್ನ ಒಂದು ಫೋಟೋ ತೆಗೆಯಬಹುದೇ?", "Excuse me, could you take a photo of me?", "Excuse me, could you taking photo to me?", "Excuse me, you could take my a photo?"],
      ["n", "Sure! Stand near the stone chariot. Smile!", "ಖಂಡಿತ! ಕಲ್ಲಿನ ರಥದ ಹತ್ತಿರ ನಿಲ್ಲಿ. ನಗಿ!"],
      ["y", "ಇನ್ನೊಂದು ಫೋಟೋ ತೆಗೆಯಬಹುದೇ?", "Could you take one more, please?", "Could you took one more, please?", "Could you take one more again it?"],
      ["n", "Done! You look great in this one.", "ಆಯಿತು! ಇದರಲ್ಲಿ ನೀವು ತುಂಬಾ ಚೆನ್ನಾಗಿ ಕಾಣುತ್ತೀರಿ."],
      ["y", "ತುಂಬಾ ಧನ್ಯವಾದ! ನಿಮ್ಮ ದಿನ ಚೆನ್ನಾಗಿರಲಿ.", "Thank you so much! Have a nice day.", "Thank you so much! Have a nice days.", "Thank you so much! Having nice day."],
    ], [
      W("photograph", "a picture taken with a camera", "ಛಾಯಾಚಿತ್ರ", "📷", "This old ___ shows my grandparents."),
      W("tourist", "a person who visits a place for fun", "ಪ್ರವಾಸಿ", "🎒", "Every ___ in Hampi visits the stone chariot."),
      W("smile", "to make a happy face", "ನಗು", "😄", "___! I am taking your picture."),
    ]),
    T("return", "npc_bull", "🐂", "Shetty the shopkeeper", "Returning something to a shop", "ಅಂಗಡಿಗೆ ವಸ್ತು ವಾಪಸ್ ಕೊಡುವುದು", [
      ["n", "Welcome back! How can I help you?", "ಮತ್ತೆ ಸ್ವಾಗತ! ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"],
      ["y", "ನಾನು ನಿನ್ನೆ ಈ ಚೀಲ ಕೊಂಡೆ, ಆದರೆ ಇದು ಹರಿದಿದೆ.", "I bought this bag yesterday, but it is torn.", "I buyed this bag yesterday, but it torn.", "I buy this bag yesterday, but it is tear."],
      ["n", "Oh, I am sorry. Do you have the bill?", "ಅಯ್ಯೋ, ಕ್ಷಮಿಸಿ. ನಿಮ್ಮ ಬಳಿ ಬಿಲ್ ಇದೆಯೇ?"],
      ["y", "ಹೌದು, ಬಿಲ್ ಇಲ್ಲಿದೆ.", "Yes, here is the bill.", "Yes, here are the bill.", "Yes, here the bill is it."],
      ["n", "Would you like a new bag or your money back?", "ನಿಮಗೆ ಹೊಸ ಚೀಲ ಬೇಕೇ ಅಥವಾ ಹಣ ವಾಪಸ್ ಬೇಕೇ?"],
      ["y", "ನನಗೆ ಹೊಸ ಚೀಲ ಕೊಡಿ.", "I would like a new bag, please.", "I would like new a bag, please.", "I would to like a new bag, please."],
    ], [
      W("exchange", "to give one thing and get another", "ಬದಲಾಯಿಸು", "🔄", "Can I ___ this shirt for a bigger size?"),
      W("damaged", "broken or spoiled", "ಹಾಳಾದ", "💔", "The box was ___ in the rain."),
      W("customer", "a person who buys from a shop", "ಗ್ರಾಹಕ", "🛍️", "A good shopkeeper listens to every ___."),
    ]),
    T("describe", "npc_monkey", "🐒", "Hanuma", "Describing a person", "ಒಬ್ಬರನ್ನು ವರ್ಣಿಸುವುದು", [
      ["n", "I am looking for my friend. Have you seen him?", "ನಾನು ನನ್ನ ಗೆಳೆಯನನ್ನು ಹುಡುಕುತ್ತಿದ್ದೇನೆ. ನೀವು ಅವನನ್ನು ನೋಡಿದ್ದೀರಾ?"],
      ["y", "ಅವನು ನೋಡಲು ಹೇಗಿದ್ದಾನೆ?", "What does he look like?", "How does he look like?", "What he looks like?"],
      ["n", "He is tall and thin, and he wears a red cap.", "ಅವನು ಎತ್ತರ ಮತ್ತು ತೆಳ್ಳಗಿದ್ದಾನೆ, ಕೆಂಪು ಟೋಪಿ ಹಾಕಿದ್ದಾನೆ."],
      ["y", "ಹೌದು! ಅವನು ದೇವಸ್ಥಾನದ ಕಡೆ ಹೋಗುವುದನ್ನು ನೋಡಿದೆ.", "Yes! I saw him going towards the temple.", "Yes! I saw he going toward temple.", "Yes! I seen him go towards to the temple."],
      ["n", "Thank you! You have sharp eyes.", "ಧನ್ಯವಾದ! ನಿಮ್ಮ ಕಣ್ಣು ತುಂಬಾ ಚುರುಕು."],
      ["y", "ಪರವಾಗಿಲ್ಲ. ಅವನು ನಿಮಗೆ ಬೇಗ ಸಿಗಲಿ.", "No problem. I hope you find him soon.", "No problem. I hope you finding him soon.", "No problem. I hoping you find he soon."],
    ], [
      W("tall", "having more height than others", "ಎತ್ತರವಾದ", "📏", "The coconut tree is very ___."),
      W("thin", "not fat", "ತೆಳ್ಳಗಿನ", "🪡", "The kitten was ___ and hungry."),
      W("towards", "in the direction of", "ಕಡೆಗೆ", "➡️", "The children ran ___ the river."),
    ]),
  ],
  badami: [
    T("interview", "npc_bull", "🐂", "Manager Nandi", "A job interview", "ಕೆಲಸದ ಸಂದರ್ಶನ", [
      ["n", "Please sit down. Tell me about yourself.", "ದಯವಿಟ್ಟು ಕುಳಿತುಕೊಳ್ಳಿ. ನಿಮ್ಮ ಬಗ್ಗೆ ಹೇಳಿ."],
      ["y", "ನಾನು ಶ್ರಮಪಟ್ಟು ಕೆಲಸ ಮಾಡುತ್ತೇನೆ ಮತ್ತು ಬೇಗ ಕಲಿಯುತ್ತೇನೆ.", "I am hardworking and I learn quickly.", "I am hardwork and I learning quick.", "I hardworking am and learn quickly I."],
      ["n", "Why do you want this job?", "ನಿಮಗೆ ಈ ಕೆಲಸ ಏಕೆ ಬೇಕು?"],
      ["y", "ನನಗೆ ಜನರೊಂದಿಗೆ ಕೆಲಸ ಮಾಡುವುದು ಇಷ್ಟ.", "I enjoy working with people.", "I enjoy to work with peoples.", "I am enjoy work with people."],
      ["n", "Good. When can you start?", "ಚೆನ್ನಾಗಿದೆ. ನೀವು ಯಾವಾಗ ಶುರು ಮಾಡಬಹುದು?"],
      ["y", "ನಾನು ಮುಂದಿನ ಸೋಮವಾರದಿಂದ ಶುರು ಮಾಡಬಹುದು.", "I can start from next Monday.", "I can starting from next Monday.", "I can start since next Monday."],
    ], [
      W("interview", "a meeting where someone asks you questions for a job", "ಸಂದರ್ಶನ", "💼", "I have a job ___ at ten o'clock."),
      W("experience", "what you have learned by doing something before", "ಅನುಭವ", "🧰", "She has five years of ___ as a teacher."),
      W("skill", "something you can do well", "ಕೌಶಲ್ಯ", "🛠️", "Speaking English is a useful ___."),
    ]),
    T("bank", "npc_parrot", "🦜", "Kamala the clerk", "At the bank", "ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ", [
      ["n", "Next, please! How may I help you?", "ಮುಂದಿನವರು ಬನ್ನಿ! ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"],
      ["y", "ನಾನು ಹೊಸ ಖಾತೆ ತೆರೆಯಬೇಕು.", "I would like to open a new account.", "I would like open new account.", "I would like to opening a new account."],
      ["n", "Please fill in this form and sign here.", "ದಯವಿಟ್ಟು ಈ ಫಾರ್ಮ್ ತುಂಬಿ, ಇಲ್ಲಿ ಸಹಿ ಮಾಡಿ."],
      ["y", "ನಿಮ್ಮ ಪೆನ್ ಸ್ವಲ್ಪ ಕೊಡುತ್ತೀರಾ?", "Could I borrow your pen, please?", "Could I lend your pen, please?", "Could I borrowing your pen, please?"],
      ["n", "Here you go. It will take ten minutes.", "ತಗೊಳ್ಳಿ. ಇದಕ್ಕೆ ಹತ್ತು ನಿಮಿಷ ಆಗುತ್ತದೆ."],
      ["y", "ಪರವಾಗಿಲ್ಲ, ನಾನು ಕಾಯುತ್ತೇನೆ.", "No problem, I will wait.", "No problem, I will waiting.", "No problem, I wait will."],
    ], [
      W("account", "a place in a bank where your money is kept", "ಖಾತೆ", "🏦", "I put some money in my bank ___ every month."),
      W("signature", "your name written in your own special way", "ಸಹಿ", "✍️", "Please put your ___ at the bottom of the page."),
      W("form", "a paper with empty spaces for you to fill in", "ಅರ್ಜಿ ನಮೂನೆ", "📄", "Fill in this ___ with your name and address."),
    ]),
    T("invite", "npc_elephant", "🐘", "Parvati akka", "Being invited home", "ಮನೆಗೆ ಆಹ್ವಾನ", [
      ["n", "We are making holige for the festival tomorrow!", "ನಾಳೆ ಹಬ್ಬಕ್ಕೆ ನಾವು ಹೋಳಿಗೆ ಮಾಡುತ್ತಿದ್ದೇವೆ!"],
      ["y", "ವಾವ್! ನನಗೆ ಹೋಳಿಗೆ ತುಂಬಾ ಇಷ್ಟ.", "Wow! I love holige.", "Wow! I am love holige.", "Wow! I loving the holige."],
      ["n", "Then please come to our house for lunch.", "ಹಾಗಾದರೆ ಊಟಕ್ಕೆ ನಮ್ಮ ಮನೆಗೆ ಬನ್ನಿ."],
      ["y", "ಖಂಡಿತ ಬರುತ್ತೇನೆ. ನಾನು ಏನಾದರೂ ತರಲೇ?", "I would love to come. Shall I bring anything?", "I would love come. Shall I bringing anything?", "I would love to coming. Shall I bring something any?"],
      ["n", "No, no. Just bring your smile!", "ಬೇಡ, ಬೇಡ. ನಿಮ್ಮ ನಗು ತಂದರೆ ಸಾಕು!"],
      ["y", "ನನ್ನನ್ನು ಕರೆದಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ.", "Thank you for inviting me.", "Thank you for invite me.", "Thank you to inviting me."],
    ], [
      W("festival", "a special day that people celebrate", "ಹಬ್ಬ", "🎊", "Ugadi is my favourite ___."),
      W("lunch", "the meal you eat in the middle of the day", "ಮಧ್ಯಾಹ್ನದ ಊಟ", "🍛", "We eat ___ at one o'clock."),
      W("welcome", "to greet someone in a friendly way when they come", "ಸ್ವಾಗತಿಸು", "🙏", "They ___ every guest with a smile."),
    ]),
  ],
  golgumbaz: [
    T("opinion", "npc_bull", "🐂", "Professor Basu", "Giving your opinion", "ನಿಮ್ಮ ಅಭಿಪ್ರಾಯ ಹೇಳುವುದು", [
      ["n", "I think silence is better than talking. Do you agree?", "ಮಾತಿಗಿಂತ ಮೌನವೇ ಮೇಲು ಎಂದು ನನಗನಿಸುತ್ತದೆ. ನೀವು ಒಪ್ಪುತ್ತೀರಾ?"],
      ["y", "ಕ್ಷಮಿಸಿ, ನಾನು ಒಪ್ಪುವುದಿಲ್ಲ.", "I am sorry, but I do not agree.", "I am sorry, but I am not agree.", "I am sorry, but I not agreeing."],
      ["n", "Oh? What is your opinion?", "ಓಹ್? ನಿಮ್ಮ ಅಭಿಪ್ರಾಯ ಏನು?"],
      ["y", "ನನ್ನ ಅಭಿಪ್ರಾಯದಲ್ಲಿ, ಎರಡೂ ಮುಖ್ಯ.", "In my opinion, both are important.", "In my opinion, both is important.", "On my opinion, both are importance."],
      ["n", "Hmm. That is a good point.", "ಹ್ಮ್. ಅದು ಒಳ್ಳೆಯ ಅಂಶ."],
      ["y", "ನನ್ನ ಮಾತು ಕೇಳಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ.", "Thank you for listening to me.", "Thank you for listen me.", "Thank you for listening me to."],
    ], [
      W("opinion", "what you think about something", "ಅಭಿಪ್ರಾಯ", "💡", "In my ___, this is the best dosa in town."),
      W("important", "something that matters a lot", "ಮುಖ್ಯ", "⭐", "Sleep is ___ for good health."),
      W("reason", "why something happens or why you do something", "ಕಾರಣ", "🧩", "What is the ___ for your smile today?"),
    ]),
    T("sorry", "npc_parrot", "🦜", "Chikki", "Saying sorry", "ಕ್ಷಮೆ ಕೇಳುವುದು", [
      ["n", "Ouch! You stepped on my foot!", "ಅಯ್ಯೋ! ನೀವು ನನ್ನ ಕಾಲು ತುಳಿದಿರಿ!"],
      ["y", "ಕ್ಷಮಿಸಿ! ನಾನು ನಿಮ್ಮನ್ನು ನೋಡಲಿಲ್ಲ.", "I am so sorry! I did not see you.", "I am so sorry! I did not saw you.", "I so sorry! I not see you."],
      ["n", "It is okay. But please be careful.", "ಪರವಾಗಿಲ್ಲ. ಆದರೆ ದಯವಿಟ್ಟು ಹುಷಾರಾಗಿರಿ."],
      ["y", "ನಿಮಗೆ ನೋವಾಯಿತೇ?", "Are you hurt?", "Are you hurted?", "Do you hurt are?"],
      ["n", "No, I am fine. Thank you for asking.", "ಇಲ್ಲ, ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ. ಕೇಳಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ."],
      ["y", "ಇನ್ನು ಮುಂದೆ ನಾನು ಹುಷಾರಾಗಿರುತ್ತೇನೆ.", "I will be more careful from now on.", "I will be more careful from now in.", "I will more careful be from now."],
    ], [
      W("careful", "paying attention so that nothing bad happens", "ಎಚ್ಚರಿಕೆಯ", "⚠️", "Be ___ when you cross the road."),
      W("accident", "something bad that happens by mistake", "ಅಪಘಾತ", "🚧", "It was an ___. I did not mean to break it."),
      W("hurt", "to feel pain or cause pain", "ನೋವಾಗು", "🩹", "Did you ___ your knee when you fell?"),
    ]),
    T("dream", "npc_elephant", "🐘", "Dada", "Talking about your dreams", "ನಿಮ್ಮ ಕನಸುಗಳ ಬಗ್ಗೆ ಮಾತು", [
      ["n", "Soon the silence will end. What will you do after that?", "ಬೇಗನೆ ಮೌನ ಮುಗಿಯುತ್ತದೆ. ಆಮೇಲೆ ನೀವು ಏನು ಮಾಡುತ್ತೀರಿ?"],
      ["y", "ನಾನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಧೈರ್ಯವಾಗಿ ಮಾತನಾಡಬೇಕು.", "I want to speak English with confidence.", "I want speak English with confident.", "I want to speaking English by confidence."],
      ["n", "That is a beautiful dream. Is it difficult?", "ಅದು ಸುಂದರವಾದ ಕನಸು. ಅದು ಕಷ್ಟವೇ?"],
      ["y", "ಸ್ವಲ್ಪ ಕಷ್ಟ, ಆದರೆ ನಾನು ಪ್ರತಿದಿನ ಅಭ್ಯಾಸ ಮಾಡುತ್ತೇನೆ.", "It is a little difficult, but I practise every day.", "It is little difficult, but I practising every day.", "It a little difficult is, but I practise every days."],
      ["n", "Then nothing can stop you!", "ಹಾಗಾದರೆ ನಿಮ್ಮನ್ನು ಯಾರೂ ತಡೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ!"],
      ["y", "ನಾನು ಎಂದಿಗೂ ಬಿಟ್ಟುಕೊಡುವುದಿಲ್ಲ.", "I will never give up.", "I will never gave up.", "I never will giving up."],
    ], [
      W("dream", "something you hope to do one day", "ಕನಸು", "🌠", "My ___ is to travel all over India."),
      W("practise", "to do something again and again to get better", "ಅಭ್ಯಾಸ ಮಾಡು", "🔁", "I ___ speaking English with my friend."),
      W("difficult", "not easy", "ಕಷ್ಟ", "🧗", "This question is ___, but I will try."),
    ]),
  ],
};
export const ALL_TALKS = Object.values(TALKS).flat();
