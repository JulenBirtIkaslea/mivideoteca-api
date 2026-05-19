const request = require('supertest');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  movie: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);

jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

describe('API de Rating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/movies/:id/rating', () => {
    it('debería actualizar el rating de una película del usuario', async () => {
      const movieMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        rating: 0,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMovieMock = {
        ...movieMock,
        rating: 4,
      };

      prisma.movie.findFirst.mockResolvedValue(movieMock);
      prisma.movie.update.mockResolvedValue(updatedMovieMock);

      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 4 });

      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { rating: 4 },
      });
    });

    it('debería devolver 400 si el rating es mayor que 5', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Rating inválido. Debe ser un número entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si el rating es negativo', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Rating inválido. Debe ser un número entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si no se envía rating en el body', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Rating inválido. Debe ser un número entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });
  });
});
