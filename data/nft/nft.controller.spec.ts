import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import * as request from 'supertest';

import { AppModule } from '../../app.module';
import { DatabaseService } from '../../database/database.service';
import { GetErdDto } from './dto/nft.dto';

const erdStubWithNFTs = (): GetErdDto => {
  return {
    erd: 'erd17djfwed563cry53thgytxg5nftvl9vkec4yvrgveu905zeq6erqqkr7cmy',
  };
};
const erdStubWithoutNFTs = (): GetErdDto => {
  return {
    erd: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
  };
};
const erdStubInvalid = (): GetErdDto => {
  return {
    erd: 'erd1qck4cpghjff88gg7rq6q4w0fndd3g33v499999z9ehjhqg9uxu222zkxwz',
  };
};

describe('NFTController', () => {
  let dbConnection: Connection;
  let httpServer: any;
  let app: any;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );
    await app.init();
    dbConnection = moduleRef
      .get<DatabaseService>(DatabaseService)
      .getDbHandle();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('findByUser', () => {
    it("should return list of user's nfts", async () => {
      const response = await request(httpServer).get(
        `/nft/user/${erdStubWithNFTs().erd}?by=rank&order=asc&page=1`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      expect(Array.isArray(response.body.nfts)).toBe(true);
      expect(response.body.nfts.length).toBeGreaterThan(0);
    });
    it('should return empty list in case user has no nfts', async () => {
      const response = await request(httpServer).get(
        `/nft/user/${erdStubWithoutNFTs().erd}?by=rank&order=asc&page=1`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      expect(Array.isArray(response.body.nfts)).toBe(true);
      expect(response.body.nfts.length).toEqual(0);
    });
    it('should return 500 in case user erd is invalid', async () => {
      const response = await request(httpServer).get(
        `/nft/user/${erdStubInvalid().erd}?by=rank&order=asc&page=1`,
      );
      expect(response.status).toBe(500);
    });
  });

  describe('findById', () => {
    it('should return NFT with id=666', async () => {
      const response = await request(httpServer).get(`/nft/id/666`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toEqual(666);
    });
    it('should return 400 in for out of range id', async () => {
      const response = await request(httpServer).get(`/nft/id/10000`);
      expect(response.status).toBe(400);
    });
  });

  describe('findAll', () => {
    it('should return 400 with page > 500', async () => {
      const response = await request(httpServer).get(
        `/nft/all?by=id&order=asc&page=501`,
      );
      expect(response.status).toBe(400);
    });
    it('should return list with id=1 for first element', async () => {
      const response = await request(httpServer).get(
        `/nft/all?by=id&order=asc&page=1`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      expect(Array.isArray(response.body.nfts)).toBe(true);
      expect(response.body.nfts.length).toEqual(20);
      expect(response.body.nfts[0].id).toEqual(1);
    });
    it('should return list with rank=1 for last element', async () => {
      const response = await request(httpServer).get(
        `/nft/all?by=rank&order=desc&page=500`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      expect(Array.isArray(response.body.nfts)).toBe(true);
      expect(response.body.nfts.length).toEqual(19);
      expect(response.body.nfts[18].rank).toEqual(1);
    });

    it('should return filtered element', async () => {
      const response = await request(httpServer).get(
        `/nft/all?by=rank&order=desc&page=1&background=kyoto%20ape&crown=shepherd%20of%20grace&hairstyle=tako&hairstyleColor=grey&eyes=oshiza&eyesColor=grey&nose=hiken&mouth=dagon&mouthColor=grey&armor=shin&weapon=oshiza%20spear&stone=lava&id=39`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      expect(Array.isArray(response.body.nfts)).toBe(true);
      expect(response.body.nfts.length).toEqual(1);
      expect(response.body.nfts[0].id).toEqual(3908);
    });
  });

  describe('findByMarket', () => {
    it('should return list of NFTs listed on deadrare + trustmarket', async () => {
      const response = await request(httpServer).get(
        `/nft/market?order=asc&page=1&by=price`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      const sources = response.body.nfts.map((el) => {
        return el.market.source;
      });
      expect(sources).toContain('deadrare');
      expect(sources).toContain('trustmarket');
    });
    it('should return prices in descending order', async () => {
      const response = await request(httpServer).get(
        '/nft/market?order=desc&page=1&by=price',
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      const prices = response.body.nfts.map((el) => {
        return el.market.currentUsd;
      });
      expect(prices[0]).toBeGreaterThan(prices[1]);
    });
    it('should return rank in descending order', async () => {
      const response = await request(httpServer).get(
        '/nft/market?order=desc&page=1&by=rank',
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      const ranks = response.body.nfts.map((el) => {
        return el.rank;
      });
      expect(ranks[0]).toBeGreaterThan(ranks[1]);
    });
    it('should return ids in ascending order', async () => {
      const response = await request(httpServer).get(
        '/nft/market?order=asc&page=1&by=id',
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nfts');
      const ids = response.body.nfts.map((el) => {
        return el.id;
      });
      expect(ids[0]).toBeLessThan(ids[1]);
    });
  });
});
