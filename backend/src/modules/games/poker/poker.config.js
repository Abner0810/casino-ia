export const POKER_LIMITES = { MIN: 1, MAX: 1000, MAX_SUBIDAS: 4 };
export const POKER_BOTS = [
  { id: 'bot-luna', nombre: 'Luna' },
  { id: 'bot-marco', nombre: 'Marco' },
  { id: 'bot-sofia', nombre: 'Sofía' },
];
export const POKER_NOMBRES_BOTS = [
  'Luna', 'Marco', 'Sofía', 'Valentina', 'Mateo',
  'Camila', 'Diego', 'Isabella', 'Nicolás', 'Martina',
  'Leo', 'Emilia', 'Gael', 'Renata', 'Thiago',
];
export const POKER_REGLAS = [
  'Texas Hold’em de cuatro puestos: tú juegas contra tres bots con dos cartas privadas cada uno y cinco comunitarias.',
  'Pasar o subir avanza una calle: preflop, flop, turn y river. Los bots responden automáticamente: pueden igualar o retirarse según sus cartas.',
  'Cada subida cuesta la apuesta inicial; puedes subir una vez por calle, hasta cuatro veces en total.',
  'El bote suma tus aportes y los de los bots que igualan; las apuestas previas de quien se retira permanecen en el bote. Si empatas, el premio se divide entre los ganadores. Retirarte pierde tu aporte.',
];
