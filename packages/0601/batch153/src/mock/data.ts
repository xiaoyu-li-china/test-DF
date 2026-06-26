import type { Movie, Session, SeatLayout, Seat, SeatType } from '../types';

const today = new Date();
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const mockMovies: Movie[] = [
  {
    id: 'movie-001',
    title: '星际穿越',
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=interstellar%20movie%20poster%20sci-fi%20space%20epic&image_size=portrait_4_3',
    duration: 169,
    genre: '科幻/冒险/剧情',
    description: '一队探险家利用他们针对虫洞的新发现，超越人类太空旅行的极限，从而开始在广袤的宇宙中进行星际航行的故事。',
    rating: 9.4,
  },
  {
    id: 'movie-002',
    title: '盗梦空间',
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=inception%20movie%20poster%20thriller%20mind%20bending&image_size=portrait_4_3',
    duration: 148,
    genre: '科幻/悬疑/动作',
    description: '一个技艺高超的盗贼，专门在人们梦境中盗取机密。他被给予一个机会来抹去自己的犯罪记录，但任务要求他完成一个不可能的任务。',
    rating: 9.3,
  },
  {
    id: 'movie-003',
    title: '阿凡达：水之道',
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=avatar%20the%20way%20of%20water%20movie%20poster%20pandora%20ocean%20world&image_size=portrait_4_3',
    duration: 192,
    genre: '科幻/动作/冒险',
    description: '杰克·萨利与奈蒂莉组建了家庭，他们的孩子也逐渐成长。然而危机未曾消散，萨利一家不得不彼此保护，为了生存而战，并且历尽艰辛。',
    rating: 8.5,
  },
];

const generateSessions = (movieId: string): Session[] => {
  const dates = [
    formatDate(today),
    formatDate(new Date(today.getTime() + 86400000)),
    formatDate(new Date(today.getTime() + 172800000)),
  ];
  const times = ['10:30', '13:00', '15:30', '18:00', '20:30'];
  const languages = ['国语 2D', '原版 2D', 'IMAX 3D'];
  const halls = ['1号激光厅', '2号IMAX厅', '3号杜比厅'];
  const prices = [49, 59, 79, 99, 129];

  const sessions: Session[] = [];
  let sessionIndex = 0;

  dates.forEach((date, dateIdx) => {
    times.forEach((time, timeIdx) => {
      sessions.push({
        id: `session-${movieId}-${dateIdx}-${timeIdx}`,
        movieId,
        date,
        time,
        language: languages[timeIdx % languages.length],
        hall: halls[sessionIndex % halls.length],
        price: prices[(dateIdx + timeIdx) % prices.length],
      });
      sessionIndex++;
    });
  });

  return sessions;
};

export const mockSessions: Record<string, Session[]> = {
  'movie-001': generateSessions('movie-001'),
  'movie-002': generateSessions('movie-002'),
  'movie-003': generateSessions('movie-003'),
};

export const getAllSessions = (): Session[] => {
  return Object.values(mockSessions).flat();
};

const ROWS = 10;
const COLS = 14;

const COUPLE_SEAT_ROWS = [8, 9];
const COUPLE_SEAT_COLS = [5, 6, 7, 8];
const WHEELCHAIR_SEATS = [[10, 1], [10, 14]];

const generateRandomSoldSeats = (): Set<string> => {
  const sold = new Set<string>();
  const totalSeats = ROWS * COLS;
  const soldCount = Math.floor(totalSeats * (0.2 + Math.random() * 0.1));

  while (sold.size < soldCount) {
    const row = Math.floor(Math.random() * ROWS) + 1;
    const col = Math.floor(Math.random() * COLS) + 1;
    sold.add(`${row}-${col}`);
  }

  return sold;
};

const soldSeatsCache: Record<string, Set<string>> = {};

export const generateSeatLayout = (sessionId: string): SeatLayout => {
  if (!soldSeatsCache[sessionId]) {
    soldSeatsCache[sessionId] = generateRandomSoldSeats();
  }

  const soldSeats = soldSeatsCache[sessionId];
  const seats: Seat[] = [];
  const coupleSeatPairs: [string, string][] = [];

  for (let row = 1; row <= ROWS; row++) {
    for (let col = 1; col <= COLS; col++) {
      const seatKey = `${row}-${col}`;
      const isSold = soldSeats.has(seatKey);

      let seatType: SeatType = 'normal';
      const isCouple = COUPLE_SEAT_ROWS.includes(row) && COUPLE_SEAT_COLS.includes(col);
      const isWheelchair = WHEELCHAIR_SEATS.some(([r, c]) => r === row && c === col);

      if (isCouple) seatType = 'couple';
      if (isWheelchair) seatType = 'wheelchair';

      seats.push({
        id: `seat-${sessionId}-${row}-${col}`,
        row,
        col,
        status: isSold ? 'sold' : 'available',
        type: seatType,
      });
    }
  }

  for (let row of COUPLE_SEAT_ROWS) {
    for (let i = 0; i < COUPLE_SEAT_COLS.length; i += 2) {
      const col1 = COUPLE_SEAT_COLS[i];
      const col2 = COUPLE_SEAT_COLS[i + 1];
      if (col2 !== undefined) {
        const id1 = `seat-${sessionId}-${row}-${col1}`;
        const id2 = `seat-${sessionId}-${row}-${col2}`;
        coupleSeatPairs.push([id1, id2]);
      }
    }
  }

  return {
    sessionId,
    rows: ROWS,
    cols: COLS,
    seats,
    coupleSeatPairs,
  };
};
