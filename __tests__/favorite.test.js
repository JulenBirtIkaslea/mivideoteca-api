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

describe('API de Favoritos', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/movies/:id/favorite', () => {
    it('debería marcar como favorita una película del usuario', async () => {
      const movieMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        isFavorite: false,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedMovieMock = { ...movieMock, isFavorite: true };

      prisma.movie.findFirst.mockResolvedValue(movieMock);
      prisma.movie.update.mockResolvedValue(updatedMovieMock);

      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(true);
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { isFavorite: true },
      });
    });

    it('debería quitar de favoritos una película ya favorita', async () => {
      const movieMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        isFavorite: true,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedMovieMock = { ...movieMock, isFavorite: false };

      prisma.movie.findFirst.mockResolvedValue(movieMock);
      prisma.movie.update.mockResolvedValue(updatedMovieMock);

      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(false);
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { isFavorite: false },
      });
    });

    it('debería devolver 404 si la película no existe o no pertenece al usuario', async () => {
      prisma.movie.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/movies/no-existe/favorite')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 500 si Prisma falla al actualizar', async () => {
      prisma.movie.findFirst.mockResolvedValue({
        id: 'movie-1',
        isFavorite: false,
        ownerId: 'user-123',
      });
      prisma.movie.update.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('No se pudo actualizar la película');
    });
  });
});
